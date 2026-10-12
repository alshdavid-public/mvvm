import { useEffect, useRef, useReducer } from "preact/hooks";

const ON_CHANGE = Symbol("ON_CHANGE");

type Callback = () => unknown;

type Subscription = {
  callback: Callback;
}

export class Reactive {
  #subscriptions = new Set<Subscription>();
  #children = new Set<Reactive>();

  next() {
    for (const subscription of this.#subscriptions) {
      subscription.callback();
    }
  }

  subscribe(callback: Callback): () => void {
    const subscription: Subscription = { callback };
    this.#add(subscription);
    return () => this.#remove(subscription);
  }

  #add(subscription: Subscription): void {
    if (this.#subscriptions.has(subscription)) {
      return;
    }
    this.#subscriptions.add(subscription);
    for (const child of this.#children) {
      child.#add(subscription);
    }
  }

  #remove(subscription: Subscription): void {
    if (!this.#subscriptions.delete(subscription)) {
      return;
    }
    for (const child of this.#children) {
      child.#remove(subscription);
    }
  }

  addChild(child: Reactive | undefined): void {
    if (!child || this.#children.has(child)) {
      return;
    }
    this.#children.add(child);
    for (const subscription of this.#subscriptions) {
      child.#add(subscription);
    }
  }

  removeChild(child: Reactive | undefined): void {
    if (!child || !this.#children.delete(child)) {
      return;
    }
    for (const subscription of this.#subscriptions) {
      child.#remove(subscription);
    }
  }
}

/**
 * Per-object reactive state: a root subject (fires on any tracked property
 * change) plus one subject per tracked property. Every property subject is a
 * child of the root, so changing a property fans out to root subscribers via
 * the same child-link machinery used for nested models.
 */
interface RxState {
  root: Reactive;
  props: Map<PropertyKey, Reactive>;
}

export function rx<T extends object, V>(
  target: ClassAccessorDecoratorTarget<T, V>,
  context: ClassAccessorDecoratorContext<T, V>,
) {
  const key = context.name;

  return {
    get(this: T): V {
      return target.get.call(this);
    },
    set(this: T, value: V) {
      const previous = target.get.call(this);
      if (previous === value) {
        return;
      }

      const subject = propertySubject(this, key);
      subject.removeChild(asReactive(previous));
      target.set.call(this, value);
      subject.addChild(asReactive(value));
      subject.next();
    },
    init(this: T, initialValue: V): V {
      propertySubject(this, key).addChild(asReactive(initialValue));
      return initialValue;
    },
  };
}

/**
 * Returns the `Reactive` subject owned by a `@rx`-decorated value, if any.
 * A value is trackable if it is a `Reactive` itself, or an object whose own
 * state was initialized by the `@rx` decorator (see `getOrInit`).
 */
function asReactive(value: unknown): Reactive | undefined {
  if (value instanceof Reactive) {
    return value;
  }
  if (value !== null && typeof value === "object" && ON_CHANGE in value) {
    return getOrInit(value).root;
  }
  return undefined;
}

function getOrInit<T extends object>(self: T): RxState {
  const holder = self as { [ON_CHANGE]?: RxState };
  if (!holder[ON_CHANGE]) {
    Object.defineProperty(holder, ON_CHANGE, {
      value: { root: new Reactive(), props: new Map<PropertyKey, Reactive>() },
      configurable: false,
      writable: false,
      enumerable: false,
    });
  }
  return holder[ON_CHANGE]!;
}

/**
 * Returns the subject for a single property, creating it (and linking it as a
 * child of the object's root subject) on first use.
 */
function propertySubject(self: object, key: PropertyKey): Reactive {
  const state = getOrInit(self);
  let subject = state.props.get(key);
  if (!subject) {
    subject = new Reactive();
    state.props.set(key, subject);
    state.root.addChild(subject);
  }
  return subject;
}


// ---------------------------------------------------------------------------
// Mutation-observing proxies for arrays and plain objects
// ---------------------------------------------------------------------------

const PROXY = Symbol("PROXY");

interface ProxyState {
  raw: object;
  /** The proxy wrapping `raw` (set immediately after construction). */
  proxy: object;
  /** Cache of raw child value -> wrapped child proxy. */
  proxies: WeakMap<object, unknown>;
  /** Subjects pending notification within the current microtask. */
  dirty: Set<Reactive>;
  /** Whether a flush has been scheduled for this microtask. */
  scheduled: boolean;
}

const PROXY_STATE = Symbol("PROXY_STATE");

/**
 * Wraps a raw child value in a proxy if it is a mutable container. Primitives,
 * functions, and already-tracked (`@rx`/proxy) values are returned as-is.
 *
 * The wrapped child's root subject is linked as a child of `parentRoot`, so
 * mutations deep inside a nested container fan out to parent subscribers.
 */
function wrapValue(
  state: ProxyState,
  parentRoot: Reactive,
  value: unknown,
): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  // Already a trackable container (@rx object or another proxy): link it.
  if (ON_CHANGE in (value as object)) {
    parentRoot.addChild(asReactive(value));
    return value;
  }
  const cached = state.proxies.get(value);
  if (cached !== undefined) {
    return cached;
  }
  const childState = createProxyState(value);
  state.proxies.set(value, childState.proxy);
  parentRoot.addChild(getOrInit(childState.proxy).root);
  return childState.proxy;
}

/**
 * Links every trackable element of a raw array into the proxy's state, so
 * `@rx` objects and nested proxies pushed/spliced in emit through the array.
 * Native array mutators bypass the `set` trap, so this re-establishes links.
 */
function linkArrayElements(
  state: ProxyState,
  proxy: object,
  raw: unknown[],
): void {
  const root = getOrInit(proxy).root;
  for (let i = 0; i < raw.length; i++) {
    const element = raw[i];
    if (element === null || typeof element !== "object") {
      continue;
    }
    const tracked = asReactive(element);
    if (tracked) {
      root.addChild(tracked);
      continue;
    }
    // A plain nested container: wrap it so its mutations propagate too.
    wrapValue(state, root, element);
  }
}

/** Marks `subject` (and any ancestor) dirty and schedules a microtask flush. */
function markDirty(state: ProxyState, subject: Reactive): void {
  state.dirty.add(subject);
  if (state.scheduled) {
    return;
  }
  state.scheduled = true;
  queueMicrotask(() => {
    state.scheduled = false;
    const subjects = [...state.dirty];
    state.dirty.clear();
    for (const s of subjects) {
      s.next();
    }
  });
}

const ARRAY_MUTATORS = new Set<PropertyKey>([
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
  "fill",
  "copyWithin",
]);

function createProxyState(raw: object): ProxyState {
  // If this raw object was already wrapped, reuse its state so identity and
  // subscriptions stay consistent and the non-configurable properties below
  // aren't redefined.
  const existing = (raw as { [PROXY_STATE]?: ProxyState })[PROXY_STATE];
  if (existing) {
    return existing;
  }

  const state: ProxyState = {
    raw,
    proxy: raw,
    proxies: new WeakMap(),
    dirty: new Set(),
    scheduled: false,
  };

  const proxy: object = new Proxy(raw, {
    get(target, key, receiver) {
      if (key === PROXY) {
        return proxy;
      }
      if (key === PROXY_STATE) {
        return state;
      }
      // Read state straight off the raw target so we never re-enter this trap
      // via `getOrInit`'s existence check (`ON_CHANGE in self`).
      if (key === ON_CHANGE) {
        return (target as { [ON_CHANGE]?: RxState })[ON_CHANGE];
      }
      const value = Reflect.get(target, key, receiver);

      // Return mutator wrappers for arrays so a single `push`/`splice` coalesces
      // its burst of index writes into one notification.
      if (Array.isArray(target) && ARRAY_MUTATORS.has(key)) {
        return (...args: unknown[]) => {
          const result = (value as (...a: unknown[]) => unknown).apply(target, args);
          // Native mutators write to the raw array, bypassing the `set` trap,
          // so (re)link trackable elements and re-key their subjects here.
          linkArrayElements(state, proxy, target as unknown[]);
          markDirty(state, getOrInit(proxy).root);
          return result;
        };
      }

      return wrapValue(state, getOrInit(proxy).root, value);
    },

    set(target, key, value, receiver) {
      const previous = Reflect.get(target, key);
      if (previous === value) {
        return true;
      }
      const subject = propertySubject(proxy, key);
      subject.removeChild(asReactive(previous));
      const ok = Reflect.set(target, key, value, receiver);
      // Link `@rx` values (or nested proxies) so their future changes propagate.
      subject.addChild(asReactive(value));
      markDirty(state, subject);
      return ok;
    },

    deleteProperty(target, key) {
      if (!Reflect.has(target, key)) {
        return true;
      }
      const ok = Reflect.deleteProperty(target, key);
      markDirty(state, propertySubject(proxy, key));
      return ok;
    },

    has(target, key) {
      // Keep ON_CHANGE visible so `asReactive` recognizes the proxy; the raw
      // target already carries it, so a plain Reflect.has suffices.
      return Reflect.has(target, key);
    },
  });

  state.proxy = proxy;

  // Install the proxy's internal state and a backing RxState so the existing
  // `getOrInit`/`asReactive` machinery treats it like any tracked object.
  Object.defineProperty(raw, PROXY_STATE, { value: state, enumerable: false });
  Object.defineProperty(raw, ON_CHANGE, {
    value: { root: new Reactive(), props: new Map<PropertyKey, Reactive>() },
    configurable: false,
    writable: false,
    enumerable: false,
  });

  return state;
}

/** Creates a reactive proxy over an array. Mutations notify subscribers. */
export function reactiveArray<T>(values: T[] = []): T[] {
  return createProxyState(values).proxy as T[];
}

/** Creates a reactive proxy over a plain object. Mutations notify subscribers. */
export function reactiveObject<T extends object>(values: T): T {
  return createProxyState(values).proxy as T;
}


export function subscribe(
  target: object,
  callback: Callback,
): () => void;
export function subscribe(
  target: object,
  property: PropertyKey,
  callback: Callback,
): () => void;
export function subscribe(
  target: object,
  propertyOrCallback: PropertyKey | Callback,
  maybeCallback?: Callback,
): () => void {
  if (typeof propertyOrCallback === "function") {
    return getOrInit(target).root.subscribe(propertyOrCallback);
  }
  return propertySubject(target, propertyOrCallback).subscribe(maybeCallback!);
}


export interface ViewModelLifecycle {
  onInit?(): void | Promise<void>;
  onDestroy?(): void | Promise<void>;
}

export function useViewModel<
  T extends object,
  U extends Array<unknown>,
>(ctor: new (...args: U) => T, args: U): T {
  const forceUpdate = useReducer(() => ({}), {})[1] as () => void;

  const ref = useRef<T | null>(null);
  if (ref.current === null) {
    ref.current = new ctor(...args);
  }
  const instance = ref.current;

  useEffect(() => {
    const lifecycle = instance as Partial<ViewModelLifecycle>;
    const onChange = () => forceUpdate();
    const unsubscribe = subscribe(instance, onChange);
    lifecycle.onInit?.();
    return () => {
      lifecycle.onDestroy?.();
      unsubscribe();
    };
  }, [instance]);

  return instance;
}

export function useReactive<T extends object>(instance: T): T {
  const forceUpdate = useReducer(() => ({}), {})[1] as () => void;

  useEffect(() => {
    const onChange = () => forceUpdate();
    const unsubscribe = subscribe(instance, onChange);
    return () => {
      unsubscribe();
    };
  }, [instance]);

  return instance;
}
