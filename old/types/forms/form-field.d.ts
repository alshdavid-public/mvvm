export declare class FormField<T> extends EventTarget {
    #private;
    get value(): T;
    set value(update: T);
    asProps(): {
        onInput: (event: Event) => void;
        value: T;
    };
    fromEvent: (event: Event) => void;
    update: (value: T) => void;
    constructor(initialValue: T);
}
