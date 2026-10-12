export declare class Reactive extends EventTarget {
    next(): void;
    subscribe(callback: () => any | Promise<any>): () => void;
    static notifyChange(self: Reactive): void;
}
