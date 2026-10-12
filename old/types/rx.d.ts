/**
 * @description This decorator dispatches a notification when a property is replaced
 */
export declare function rx<T, V>(_target: ClassAccessorDecoratorTarget<T, V>, context: ClassAccessorDecoratorContext<T, V>): {
    get(this: T): V;
    set(this: T, value: V): void;
    init(this: T, initialValue: V): V;
};
