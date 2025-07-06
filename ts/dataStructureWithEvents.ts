export class EventMap<T extends defined> {
    private stringifiedEventToValue: Map<string, T> = new Map();
    private stringifiedEventToEvent: Map<string, RBXScriptSignal> = new Map();
    constructor() {}
    set(key: RBXScriptSignal, value: T): this {
        const stringifiedEvent = tostring(key);
        this.stringifiedEventToValue.set(stringifiedEvent, value);
        this.stringifiedEventToEvent.set(stringifiedEvent, key);
        return this;
    }
    delete(key: RBXScriptSignal): boolean {
        const stringifiedEvent = tostring(key);
        return (
            this.stringifiedEventToEvent.delete(stringifiedEvent) &&
            this.stringifiedEventToValue.delete(stringifiedEvent)
        );
    }
    clear(): void {
        this.stringifiedEventToEvent.clear();
        this.stringifiedEventToValue.clear();
    }
    isEmpty(): boolean {
        return (
            this.stringifiedEventToEvent.isEmpty() &&
            this.stringifiedEventToValue.isEmpty()
        );
    }
    forEach(callbackfn: (value: T, key: RBXScriptSignal) => void): void {
        this.stringifiedEventToValue.forEach((value, stringifiedEvent) => {
            callbackfn(
                value,
                this.stringifiedEventToEvent.get(stringifiedEvent)!,
            );
        });
    }
    size(): number {
        return (
            (this.stringifiedEventToValue.size() +
                this.stringifiedEventToValue.size()) /
            2
        );
    }
    has(key: RBXScriptSignal): boolean {
        const stringifiedEvent = tostring(key);
        return (
            this.stringifiedEventToEvent.has(stringifiedEvent) &&
            this.stringifiedEventToValue.has(stringifiedEvent)
        );
    }
    get(key: RBXScriptSignal): T | undefined {
        const stringifiedEvent = tostring(key);
        return this.stringifiedEventToValue.get(stringifiedEvent);
    }
}

export class EventMapWithInstance<T extends defined> {
    private instanceEventMaps: Map<Instance, EventMap<T>> = new Map();
    constructor() {}
    set(instance: Instance, key: RBXScriptSignal, value: T): this {
        let eventMap = this.instanceEventMaps.get(instance);
        if (eventMap === undefined) {
            eventMap = new EventMap<T>();
            this.instanceEventMaps.set(instance, eventMap);
        }
        eventMap.set(key, value);
        return this;
    }
    delete(instance: Instance, key: RBXScriptSignal): boolean {
        const eventMap = this.instanceEventMaps.get(instance);
        if (eventMap === undefined) {
            return false;
        }
        return eventMap.delete(key);
    }
    clear(): void {
        this.instanceEventMaps.clear();
    }
    deletedInstance(instance: Instance): boolean {
        return this.instanceEventMaps.delete(instance);
    }
    isEmpty(): boolean {
        return this.instanceEventMaps.isEmpty();
    }
    isInstanceEmpty(instance: Instance): boolean {
        const eventMap = this.instanceEventMaps.get(instance);
        if (eventMap === undefined) {
            return true;
        }
        return eventMap.isEmpty();
    }
    forEach(callbackfn: (value: T, key: RBXScriptSignal) => void): void {
        this.instanceEventMaps.forEach((eventMap) => {
            eventMap.forEach((value, event) => {
                callbackfn(value, event);
            });
        });
    }
    size(): number {
        let size = 0;
        this.instanceEventMaps.forEach((eventMap) => {
            size += eventMap.size();
        });
        return size;
    }
    has(instance: Instance, key: RBXScriptSignal): boolean {
        const eventMap = this.instanceEventMaps.get(instance);
        if (eventMap === undefined) {
            return false;
        }
        return eventMap.has(key);
    }
    get(instance: Instance, key: RBXScriptSignal): T | undefined {
        const eventMap = this.instanceEventMaps.get(instance);
        if (eventMap === undefined) {
            return undefined;
        }
        return eventMap.get(key);
    }
}

export class EventSet {
    private stringifiedEventToEvent: Map<string, RBXScriptSignal> = new Map();
    constructor() {}
    add(value: RBXScriptSignal<Callback>): this {
        const stringifiedEvent = tostring(value);
        if (!this.stringifiedEventToEvent.has(stringifiedEvent)) {
            this.stringifiedEventToEvent.set(stringifiedEvent, value);
        }
        return this;
    }
    delete(value: RBXScriptSignal<Callback>): boolean {
        const stringifiedEvent = tostring(value);
        return this.stringifiedEventToEvent.delete(stringifiedEvent);
    }
    clear(): void {
        this.stringifiedEventToEvent.clear();
    }
    isEmpty(): boolean {
        return this.stringifiedEventToEvent.isEmpty();
    }
    forEach(callbackfn: (value: RBXScriptSignal) => void): void {
        this.stringifiedEventToEvent.forEach((event) => {
            callbackfn(event);
        });
    }
    size(): number {
        return this.stringifiedEventToEvent.size();
    }
    has(value: RBXScriptSignal<Callback>): boolean {
        const stringifiedEvent = tostring(value);
        return this.stringifiedEventToEvent.has(stringifiedEvent);
    }
}

export class EventSetWithInstance {
    private instanceEventSets: Map<Instance, EventSet> = new Map();
    constructor() {}
    add(instance: Instance, value: RBXScriptSignal<Callback>): this {
        let eventSet = this.instanceEventSets.get(instance);
        if (eventSet === undefined) {
            eventSet = new EventSet();
            this.instanceEventSets.set(instance, eventSet);
        }
        eventSet.add(value);
        return this;
    }
    delete(instance: Instance, value: RBXScriptSignal<Callback>): boolean {
        const eventSet = this.instanceEventSets.get(instance);
        if (eventSet === undefined) {
            return false;
        }
        return eventSet.delete(value);
    }
    deleteInstance(instance: Instance): boolean {
        return this.instanceEventSets.delete(instance);
    }
    clear(): void {
        this.instanceEventSets.clear();
    }
    isEmpty(): boolean {
        return this.instanceEventSets.isEmpty();
    }
    isInstanceEmpty(instance: Instance): boolean {
        const eventSet = this.instanceEventSets.get(instance);
        if (eventSet === undefined) {
            return true;
        }
        return eventSet.isEmpty();
    }
    forEach(callbackfn: (value: RBXScriptSignal) => void): void {
        this.instanceEventSets.forEach((eventSet) => {
            eventSet.forEach((event) => {
                callbackfn(event);
            });
        });
    }
    size(): number {
        let size = 0;
        this.instanceEventSets.forEach((eventSet) => {
            size += eventSet.size();
        });
        return size;
    }
    has(instance: Instance, value: RBXScriptSignal<Callback>): boolean {
        const eventSet = this.instanceEventSets.get(instance);
        if (eventSet === undefined) {
            return false;
        }
        return eventSet.has(value);
    }
}
