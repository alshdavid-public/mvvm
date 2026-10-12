import { FormField } from "./form-field.ts";

export class NumberField extends FormField<number> {
  constructor(initialValue: number) {
    super(initialValue);
  }
}
