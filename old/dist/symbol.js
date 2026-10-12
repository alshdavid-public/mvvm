import { Reactive } from "./reactive.js";
export const ON_CHANGE = Symbol("ON_CHANGE");
export function getOrInit(self) {
    if (!self[ON_CHANGE]) {
        Object.defineProperty(self, ON_CHANGE, {
            value: [new Reactive(), {}],
            configurable: false,
            writable: false,
            enumerable: false,
        });
    }
    return self[ON_CHANGE];
}
