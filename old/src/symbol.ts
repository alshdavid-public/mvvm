import { Reactive } from "./reactive.ts";

export const ON_CHANGE = Symbol("ON_CHANGE");

export type RxState = [Reactive, Record<any, any>];

export function getOrInit(self: any): RxState {
  if (!self[ON_CHANGE]) {
    Object.defineProperty(self, ON_CHANGE, {
      value: [new Reactive(), {}],
      configurable: false,
      writable: false,
      enumerable: false,
    });
  }
  return self[ON_CHANGE] as any;
}
