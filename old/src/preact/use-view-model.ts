import { useEffect, useMemo, useReducer } from "preact/hooks";
import { subscribe } from "../subscribe.ts";

export interface ViewModelLifecycle {
  onInit?(): any | Promise<any>;
  onDestroy?(): any | Promise<any>;
}

export function useViewModel<
  T extends ViewModelLifecycle & Object,
  U extends Array<any>,
>(ctor: new (...args: U) => T, args: U): T {
  const forceUpdate = useReducer(() => ({}), {})[1] as () => void;

  const instance = useMemo(() => new ctor(...args), [ctor, ...args]);

  useEffect(() => {
    const onChange = () => forceUpdate();
    const unsubscribe = subscribe(instance, onChange);
    instance.onInit?.();
    return () => {
      instance.onDestroy?.();
      unsubscribe();
    };
  }, [instance]);

  return instance;
}

export function useReactive<T>(instance: T): T {
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
