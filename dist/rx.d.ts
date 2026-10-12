type Callback = () => unknown;
export declare class Reactive {
    #private;
    next(): void;
    subscribe(callback: Callback): () => void;
    addChild(child: Reactive | undefined): void;
    removeChild(child: Reactive | undefined): void;
}
export declare function rx<T extends object, V>(target: ClassAccessorDecoratorTarget<T, V>, context: ClassAccessorDecoratorContext<T, V>): {
    get(this: T): V;
    set(this: T, value: V): void;
    init(this: T, initialValue: V): V;
};
/** Creates a reactive proxy over an array. Mutations notify subscribers. */
export declare function reactiveArray<T>(values?: T[]): T[];
/** Creates a reactive proxy over a plain object. Mutations notify subscribers. */
export declare function reactiveObject<T extends object>(values: T): T;
export declare function subscribe(target: object, callback: Callback): () => void;
export declare function subscribe(target: object, property: PropertyKey, callback: Callback): () => void;
export interface ViewModelLifecycle {
    onInit?(): void | Promise<void>;
    onDestroy?(): void | Promise<void>;
}
export declare function useViewModel<T extends object, U extends Array<unknown>>(ctor: new (...args: U) => T, args: U): T;
export declare function useReactive<T extends object>(instance: T): T;
export {};
