import { FormField } from "./form-field.ts";

export class BooleanField extends FormField<boolean> {
  constructor(initialValue: boolean) {
    super(initialValue);
  }
}
