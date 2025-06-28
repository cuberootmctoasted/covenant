export declare class EventMap<T extends defined> {
    private stringifiedEventToValue;
    private stringifiedEventToEvent;
    constructor();
    set(key: RBXScriptSignal, value: T): this;
    delete(key: RBXScriptSignal): boolean;
    clear(): void;
    isEmpty(): boolean;
    forEach(callbackfn: (value: T, key: RBXScriptSignal) => void): void;
    size(): number;
    has(key: RBXScriptSignal): boolean;
    get(key: RBXScriptSignal): T | undefined;
}
export declare class EventSet {
    private stringifiedEventToEvent;
    constructor();
    add(value: RBXScriptSignal<Callback>): this;
    delete(value: RBXScriptSignal<Callback>): boolean;
    clear(): void;
    isEmpty(): boolean;
    forEach(callbackfn: (value: RBXScriptSignal) => void): void;
    size(): number;
    has(value: RBXScriptSignal<Callback>): boolean;
}
