import { Reactive } from "./reactive.ts";
export declare const ON_CHANGE: unique symbol;
export type RxState = [Reactive, Record<any, any>];
export declare function getOrInit(self: any): RxState;
