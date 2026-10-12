export class FormField<T> extends EventTarget {
  #value: T;

  get value(): T {
    return this.#value;
  }

  set value(update: T) {
    this.update(update);
  }

  asProps() {
    return { onInput: this.fromEvent, value: this.#value };
  }

  fromEvent = (event: Event) => {
    this.update(
      // @ts-expect-error
      event?.target?.value,
    );
  };

  update = (value: T) => {
    if (this.#value === value) {
      return;
    }
    this.#value = value;
    this.dispatchEvent(new CustomEvent("change"));
  };

  constructor(initialValue: T) {
    super();
    this.#value = initialValue;
  }
}
