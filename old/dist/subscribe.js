import { Reactive } from "./reactive.js";
import { getOrInit, ON_CHANGE } from "./symbol.js";
export function subscribe(target, callback) {
    const [subject, stash] = getOrInit(target);
    const subscriptions = [subject.subscribe(callback)];
    for (const value of Object.values(stash) || []) {
        if (value instanceof Reactive) {
            subscriptions.push(value.subscribe(callback));
            continue;
        }
        if (typeof value === "object" && ON_CHANGE in value) {
            subscriptions.push(subscribe(value, callback));
        }
    }
    return () => subscriptions.forEach((cb) => cb());
}
