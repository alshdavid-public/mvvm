import { getOrInit } from "./symbol.js";
/**
 * @description This decorator dispatches a notification when a property is replaced
 */
export function rx(_target, context) {
    const propertyKey = context.name;
    return {
        get() {
            return getOrInit(this)[1][propertyKey];
        },
        set(value) {
            const [subject, stash] = getOrInit(this);
            if (stash[propertyKey] === value) {
                return;
            }
            stash[propertyKey] = value;
            subject.next();
        },
        init(initialValue) {
            const [, stash] = getOrInit(this);
            stash[propertyKey] = initialValue;
            return initialValue;
        },
    };
}
