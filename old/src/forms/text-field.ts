import { FormField } from "./form-field.ts";

export class TextField extends FormField<string> {
  constructor(initialValue: string = "") {
    super(initialValue);
  }
}
