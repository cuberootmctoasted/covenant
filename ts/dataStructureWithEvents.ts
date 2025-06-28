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
