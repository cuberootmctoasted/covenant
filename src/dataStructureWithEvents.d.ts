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
export declare class EventMapWithInstance<T extends defined> {
    private instanceEventMaps;
    constructor();
    set(instance: Instance, key: RBXScriptSignal, value: T): this;
    delete(instance: Instance, key: RBXScriptSignal): boolean;
    clear(): void;
    deletedInstance(instance: Instance): boolean;
    isEmpty(): boolean;
    isInstanceEmpty(instance: Instance): boolean;
    forEach(callbackfn: (value: T, key: RBXScriptSignal) => void): void;
    size(): number;
    has(instance: Instance, key: RBXScriptSignal): boolean;
    get(instance: Instance, key: RBXScriptSignal): T | undefined;
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
export declare class EventSetWithInstance {
    private instanceEventSets;
    constructor();
    add(instance: Instance, value: RBXScriptSignal<Callback>): this;
    delete(instance: Instance, value: RBXScriptSignal<Callback>): boolean;
    deleteInstance(instance: Instance): boolean;
    clear(): void;
    isEmpty(): boolean;
    isInstanceEmpty(instance: Instance): boolean;
    forEach(callbackfn: (value: RBXScriptSignal) => void): void;
    size(): number;
    has(instance: Instance, value: RBXScriptSignal<Callback>): boolean;
}
