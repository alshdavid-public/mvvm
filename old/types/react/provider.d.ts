export declare const InjectContext: import("react").Context<Provider>;
export declare class Provider extends Map<any, any> {
    static Provider: import("react").Provider<Provider>;
    provide(token: any, value: any): void;
}
export declare function useInjectContext(): Provider;
export declare function useInject<C extends new (...args: any[]) => any>(key: C): InstanceType<C>;
export declare function useInject<T>(key: any): T;
