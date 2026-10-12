export interface ViewModelLifecycle {
    onInit?(): any | Promise<any>;
    onDestroy?(): any | Promise<any>;
}
export declare function useViewModel<T extends ViewModelLifecycle & Object, U extends Array<any>>(ctor: new (...args: U) => T, args: U): T;
export declare function useReactive<T>(instance: T): T;
