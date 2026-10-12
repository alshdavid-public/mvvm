import { useEffect, useRef, useReducer } from "preact/hooks";
const ON_CHANGE = Symbol("ON_CHANGE");
export class Reactive {
    #subscriptions = new Set();
    #children = new Set();
    next() {
        for (const subscription of this.#subscriptions) {
            subscription.callback();
        }
    }
    subscribe(callback) {
        const subscription = { callback };
        this.#add(subscription);
        return () => this.#remove(subscription);
    }
    #add(subscription) {
        if (this.#subscriptions.has(subscription)) {
            return;
        }
        this.#subscriptions.add(subscription);
        for (const child of this.#children) {
            child.#add(subscription);
        }
    }
    #remove(subscription) {
        if (!this.#subscriptions.delete(subscription)) {
            return;
        }
        for (const child of this.#children) {
            child.#remove(subscription);
        }
    }
    addChild(child) {
        if (!child || this.#children.has(child)) {
            return;
        }
        this.#children.add(child);
        for (const subscription of this.#subscriptions) {
            child.#add(subscription);
        }
    }
    removeChild(child) {
        if (!child || !this.#children.delete(child)) {
            return;
        }
        for (const subscription of this.#subscriptions) {
            child.#remove(subscription);
        }
    }
}
export function rx(target, context) {
    const key = context.name;
    return {
        get() {
            return target.get.call(this);
        },
        set(value) {
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
        init(initialValue) {
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
function asReactive(value) {
    if (value instanceof Reactive) {
        return value;
    }
    if (value !== null && typeof value === "object" && ON_CHANGE in value) {
        return getOrInit(value).root;
    }
    return undefined;
}
function getOrInit(self) {
    const holder = self;
    if (!holder[ON_CHANGE]) {
        Object.defineProperty(holder, ON_CHANGE, {
            value: { root: new Reactive(), props: new Map() },
            configurable: false,
            writable: false,
            enumerable: false,
        });
    }
    return holder[ON_CHANGE];
}
/**
 * Returns the subject for a single property, creating it (and linking it as a
 * child of the object's root subject) on first use.
 */
function propertySubject(self, key) {
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
const PROXY_STATE = Symbol("PROXY_STATE");
/**
 * Wraps a raw child value in a proxy if it is a mutable container. Primitives,
 * functions, and already-tracked (`@rx`/proxy) values are returned as-is.
 *
 * The wrapped child's root subject is linked as a child of `parentRoot`, so
 * mutations deep inside a nested container fan out to parent subscribers.
 */
function wrapValue(state, parentRoot, value) {
    if (value === null || typeof value !== "object") {
        return value;
    }
    // Already a trackable container (@rx object or another proxy): link it.
    if (ON_CHANGE in value) {
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
function linkArrayElements(state, proxy, raw) {
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
function markDirty(state, subject) {
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
const ARRAY_MUTATORS = new Set([
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
function createProxyState(raw) {
    // If this raw object was already wrapped, reuse its state so identity and
    // subscriptions stay consistent and the non-configurable properties below
    // aren't redefined.
    const existing = raw[PROXY_STATE];
    if (existing) {
        return existing;
    }
    const state = {
        raw,
        proxy: raw,
        proxies: new WeakMap(),
        dirty: new Set(),
        scheduled: false,
    };
    const proxy = new Proxy(raw, {
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
                return target[ON_CHANGE];
            }
            const value = Reflect.get(target, key, receiver);
            // Return mutator wrappers for arrays so a single `push`/`splice` coalesces
            // its burst of index writes into one notification.
            if (Array.isArray(target) && ARRAY_MUTATORS.has(key)) {
                return (...args) => {
                    const result = value.apply(target, args);
                    // Native mutators write to the raw array, bypassing the `set` trap,
                    // so (re)link trackable elements and re-key their subjects here.
                    linkArrayElements(state, proxy, target);
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
        value: { root: new Reactive(), props: new Map() },
        configurable: false,
        writable: false,
        enumerable: false,
    });
    return state;
}
/** Creates a reactive proxy over an array. Mutations notify subscribers. */
export function reactiveArray(values = []) {
    return createProxyState(values).proxy;
}
/** Creates a reactive proxy over a plain object. Mutations notify subscribers. */
export function reactiveObject(values) {
    return createProxyState(values).proxy;
}
export function subscribe(target, propertyOrCallback, maybeCallback) {
    if (typeof propertyOrCallback === "function") {
        return getOrInit(target).root.subscribe(propertyOrCallback);
    }
    return propertySubject(target, propertyOrCallback).subscribe(maybeCallback);
}
export function useViewModel(ctor, args) {
    const forceUpdate = useReducer(() => ({}), {})[1];
    const ref = useRef(null);
    if (ref.current === null) {
        ref.current = new ctor(...args);
    }
    const instance = ref.current;
    useEffect(() => {
        const lifecycle = instance;
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
export function useReactive(instance) {
    const forceUpdate = useReducer(() => ({}), {})[1];
    useEffect(() => {
        const onChange = () => forceUpdate();
        const unsubscribe = subscribe(instance, onChange);
        return () => {
            unsubscribe();
        };
    }, [instance]);
    return instance;
}
