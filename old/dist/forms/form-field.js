export class FormField extends EventTarget {
    #value;
    get value() {
        return this.#value;
    }
    set value(update) {
        this.update(update);
    }
    asProps() {
        return { onInput: this.fromEvent, value: this.#value };
    }
    fromEvent = (event) => {
        this.update(
        // @ts-expect-error
        event?.target?.value);
    };
    update = (value) => {
        if (this.#value === value) {
            return;
        }
        this.#value = value;
        this.dispatchEvent(new CustomEvent("change"));
    };
    constructor(initialValue) {
        super();
        this.#value = initialValue;
    }
}
