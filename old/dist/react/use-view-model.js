import { useEffect, useMemo, useReducer } from "react";
import { subscribe } from "../subscribe.js";
export function useViewModel(ctor, args) {
    const forceUpdate = useReducer(() => ({}), {})[1];
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
