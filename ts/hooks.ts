import { Entity } from "@rbxts/jecs";
import { EventMapWithInstance, EventSetWithInstance } from "./dataStructureWithEvents";
import { Covenant } from "./covenant";

type AsyncResult<T = unknown> = {
    completed: boolean;
    value: T | undefined;
    errorMessage?: string;
};
export type Discriminator = Exclude<defined, number>;

// TODO: make events available for dynamic instances
export interface CovenantHooks {
    useEvent: <T extends Array<unknown>>(
        updateId: number,
        instance: Instance,
        event: RBXScriptSignal<(...args: T) => void>,
    ) => T[];
    useEventImmediately: <T extends Array<unknown>, TReturn extends defined>(
        updateId: number,
        instance: Instance,
        event: RBXScriptSignal<(...args: T) => void>,
        callback: (...args: T) => TReturn,
    ) => TReturn[];
    useComponentChange: <T extends defined>(
        updateId: number,
        component: Entity<T>,
        payload: boolean,
    ) => {
        entity: Entity;
        state: T | undefined;
        previousState: T | undefined;
    }[];
    useAsync: <T>(
        updateId: number,
        asnycFactory: () => T,
        dependencies: unknown[],
        discriminator: Discriminator,
    ) => AsyncResult<T>;
    useImperative: <T extends defined>(
        updateId: number,
        dirtyFactory: (indicateUpdate: () => void) => {
            value: T;
            cleanup?: () => void;
        },
        dependencies: unknown[],
        discriminator: Discriminator,
    ) => T;
    useChange: (updateId: number, dependencies: unknown[], discriminator: Discriminator) => boolean;
    useInterval: (
        updateId: number,
        seconds: number,
        trueOnInit: boolean,
        discriminator: Discriminator,
    ) => boolean;
}

interface CovenantHooksProps {
    indicateUpdate: () => void;
    covenant: Covenant;
}

function createUseEvent({ indicateUpdate }: CovenantHooksProps): CovenantHooks["useEvent"] {
    const queues: EventMapWithInstance<defined[]> = new EventMapWithInstance();
    const watchedEvents: EventSetWithInstance = new EventSetWithInstance();
    const caches: EventMapWithInstance<defined> = new EventMapWithInstance();
    let lastUpdateId = -1;
    return function <T extends Array<unknown>>(
        updateId: number,
        instance: Instance,
        event: RBXScriptSignal<(...args: T) => void>,
    ): T[] {
        if (lastUpdateId !== updateId) {
            caches.clear();
            lastUpdateId = updateId;
        }
        const cache = caches.get(instance, event);
        if (cache !== undefined) {
            return cache as T[];
        }
        if (!watchedEvents.has(instance, event)) {
            watchedEvents.add(instance, event);
            queues.set(instance, event, []);
            const connection = event.Connect((...args) => {
                queues.get(instance, event)!.push(args);
                indicateUpdate();
            });
            instance.Destroying.Once(() => {
                connection.Disconnect();
            });
            caches.set(instance, event, []);
            return [];
        }
        const queue = queues.get(instance, event)!;
        if (!queue.isEmpty()) {
            queues.set(instance, event, []);
        }
        caches.set(instance, event, queue);
        return queue as T[];
    };
}

function createUseEventImmediately({
    indicateUpdate,
}: CovenantHooksProps): CovenantHooks["useEventImmediately"] {
    const queues: EventMapWithInstance<defined[]> = new EventMapWithInstance();
    const watchedEvents: EventSetWithInstance = new EventSetWithInstance();
    const caches: EventMapWithInstance<defined> = new EventMapWithInstance();
    let lastUpdateId = -1;
    return function <T extends Array<unknown>, TReturn extends defined>(
        updateId: number,
        instance: Instance,
        event: RBXScriptSignal<(...args: T) => void>,
        callback: (...args: T) => TReturn,
    ): TReturn[] {
        if (lastUpdateId !== updateId) {
            caches.clear();
            lastUpdateId = updateId;
        }
        const cache = caches.get(instance, event);
        if (cache !== undefined) {
            return cache as TReturn[];
        }
        if (!watchedEvents.has(instance, event)) {
            watchedEvents.add(instance, event);
            queues.set(instance, event, []);
            event.Connect((...args) => {
                queues.get(instance, event)!.push(callback(...args));
                indicateUpdate();
            });
            caches.set(instance, event, []);
            return [];
        }
        const queue = queues.get(instance, event)!;
        if (!queue.isEmpty()) {
            queues.set(instance, event, []);
        }
        caches.set(instance, event, queue);
        return queue as TReturn[];
    };
}

function createUseComponentChange({
    covenant,
    indicateUpdate,
}: CovenantHooksProps): CovenantHooks["useComponentChange"] {
    const queues: Map<string, { entity: Entity; state: unknown; previousState: unknown }[]> =
        new Map();
    const watchedStringifiedComponents: Set<string> = new Set();
    const caches: Map<string, defined> = new Map();
    let lastUpdateId = -1;
    return function <T extends defined>(
        updateId: number,
        component: Entity<T>,
        payload: boolean = false,
    ): {
        entity: Entity;
        state: T | undefined;
        previousState: T | undefined;
    }[] {
        if (lastUpdateId !== updateId) {
            caches.clear();
            lastUpdateId = updateId;
        }
        const stringifiedComponent = tostring(component);
        const cache = caches.get(stringifiedComponent);
        if (cache !== undefined) {
            return cache as {
                entity: Entity;
                state: T | undefined;
                previousState: T | undefined;
            }[];
        }
        if (!watchedStringifiedComponents.has(stringifiedComponent)) {
            watchedStringifiedComponents.add(stringifiedComponent);
            queues.set(stringifiedComponent, []);
            covenant.subscribeComponent(component, (entity, state, previousState) => {
                queues.get(stringifiedComponent)!.push({ entity, state, previousState });
                indicateUpdate();
            });
            caches.set(stringifiedComponent, []);
            if (!payload) {
                return [];
            } else {
                const payloadQueue: {
                    entity: Entity;
                    state: T | undefined;
                    previousState: T | undefined;
                }[] = [];
                for (const [entity, state] of covenant.worldQuery(component)) {
                    payloadQueue.push({ entity, state, previousState: undefined });
                }
                return payloadQueue;
            }
        }
        const queue = queues.get(stringifiedComponent)!;
        if (!queue.isEmpty()) {
            queues.set(stringifiedComponent, []);
        }
        caches.set(stringifiedComponent, queue);
        return queue as {
            entity: Entity;
            state: T | undefined;
            previousState: T | undefined;
        }[];
    };
}

function equalsDependencies(a: unknown[], b: unknown[]) {
    if (a === b) return true;
    if (a.size() !== b.size()) return false;
    for (let i = 0; i < a.size(); i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}

function executeThread<T = unknown>(res: AsyncResult<T>, asnycFn: () => T, update: () => void) {
    res.completed = false;
    const [sucess, errMsg] = pcall(() => {
        res.value = asnycFn();
    });
    if (!sucess && typeIs(errMsg, "string")) {
        res.errorMessage = errMsg;
    }
    res.completed = true;
    update();
}

function createUseAsync({ indicateUpdate }: CovenantHooksProps): CovenantHooks["useAsync"] {
    const storage: Map<
        Discriminator,
        {
            lastDependencies: unknown[];
            thread: thread;
            result: AsyncResult;
        }
    > = new Map();
    const caches: Map<Discriminator, defined> = new Map();
    let lastUpdateId = -1;
    return function <T>(
        updateId: number,
        asnycFactory: () => T,
        dependencies: unknown[],
        discriminator: Discriminator,
    ): AsyncResult<T> {
        if (lastUpdateId !== updateId) {
            caches.clear();
            lastUpdateId = updateId;
        }
        const cache = caches.get(discriminator);
        if (cache !== undefined) {
            return cache as AsyncResult<T>;
        }
        if (!storage.has(discriminator)) {
            const newResult: AsyncResult = {
                completed: false,
                value: undefined,
            };
            const thread = coroutine.create(executeThread);
            coroutine.resume(thread, newResult, asnycFactory, indicateUpdate);
            storage.set(discriminator, {
                lastDependencies: dependencies,
                thread,
                result: newResult,
            });
            caches.set(discriminator, newResult);
            return newResult as AsyncResult<T>;
        }
        const state = storage.get(discriminator)!;
        if (equalsDependencies(state.lastDependencies, dependencies)) {
            caches.set(discriminator, state.result);
            return state.result as AsyncResult<T>;
        } else {
            coroutine.close(state.thread);
            const newResult: AsyncResult = {
                completed: false,
                value: undefined,
            };
            const newThread = coroutine.create(executeThread);
            coroutine.resume(newThread, newResult, asnycFactory, indicateUpdate);
            storage.set(discriminator, {
                lastDependencies: dependencies,
                thread: newThread,
                result: newResult,
            });
            caches.set(discriminator, newResult);
            return newResult as AsyncResult<T>;
        }
    };
}

function createUseImperative({
    indicateUpdate,
}: CovenantHooksProps): CovenantHooks["useImperative"] {
    const storage: Map<
        Discriminator,
        { cache: defined; cleanup?: () => void; lastDependencies: unknown[] }
    > = new Map();
    const caches: Map<Discriminator, defined> = new Map();
    let lastUpdateId = -1;
    return function <T extends defined>(
        updateId: number,
        dirtyFactory: (indicateUpdate: () => void) => {
            value: T;
            cleanup?: () => void;
        },
        dependencies: unknown[],
        discriminator: Discriminator,
    ): T {
        if (lastUpdateId !== updateId) {
            caches.clear();
            lastUpdateId = updateId;
        }
        const cache = caches.get(discriminator);
        if (cache !== undefined) {
            return cache as T;
        }
        if (!storage.has(discriminator)) {
            const { value, cleanup } = dirtyFactory(indicateUpdate);
            storage.set(discriminator, {
                cache: value,
                cleanup,
                lastDependencies: dependencies,
            });
            caches.set(discriminator, value);
            return value;
        }
        const state = storage.get(discriminator)!;
        if (equalsDependencies(state.lastDependencies, dependencies)) {
            caches.set(discriminator, state.cache);
            return state.cache as T;
        } else {
            if (state.cleanup !== undefined) state.cleanup();
            const { value, cleanup } = dirtyFactory(indicateUpdate);
            storage.set(discriminator, {
                cache: value,
                cleanup,
                lastDependencies: dependencies,
            });
            caches.set(discriminator, value);
            return value;
        }
    };
}

function createUseChange(): CovenantHooks["useChange"] {
    const dependenciesStorage: Map<Discriminator, unknown[]> = new Map();
    const caches: Map<Discriminator, defined> = new Map();
    let lastUpdateId = -1;
    return function (
        updateId: number,
        dependencies: unknown[],
        discriminator: Discriminator,
    ): boolean {
        if (lastUpdateId !== updateId) {
            caches.clear();
            lastUpdateId = updateId;
        }
        const cache = caches.get(discriminator);
        if (cache !== undefined) {
            return cache as boolean;
        }
        if (!dependenciesStorage.has(discriminator)) {
            dependenciesStorage.set(discriminator, dependencies);
            caches.set(discriminator, true);
            return true;
        }
        const lastDependencies = dependenciesStorage.get(discriminator)!;
        if (equalsDependencies(lastDependencies, dependencies)) {
            caches.set(discriminator, false);
            return false;
        } else {
            dependenciesStorage.set(discriminator, dependencies);
            caches.set(discriminator, true);
            return true;
        }
    };
}

function createUseInterval({ indicateUpdate }: CovenantHooksProps): CovenantHooks["useInterval"] {
    const nextClocks: Map<Discriminator, number> = new Map();
    const caches: Map<Discriminator, defined> = new Map();
    let lastUpdateId = -1;
    return function (
        updateId: number,
        seconds: number,
        trueOnInit: boolean,
        discriminator: Discriminator,
    ): boolean {
        if (lastUpdateId !== updateId) {
            caches.clear();
            lastUpdateId = updateId;
        }
        const cache = caches.get(discriminator);
        if (cache !== undefined) {
            return cache as boolean;
        }
        if (!nextClocks.has(discriminator)) {
            nextClocks.set(discriminator, os.clock() + seconds);
            task.delay(seconds, indicateUpdate);
            caches.set(discriminator, trueOnInit);
            return trueOnInit;
        }
        const nextClock = nextClocks.get(discriminator)!;
        if (nextClock > os.clock()) {
            caches.set(discriminator, false);
            return false;
        } else {
            nextClocks.set(discriminator, os.clock() + seconds);
            task.delay(seconds, indicateUpdate);
            caches.set(discriminator, true);
            return true;
        }
    };
}

export function createHooks(props: CovenantHooksProps): CovenantHooks {
    return {
        useEvent: createUseEvent(props),
        useEventImmediately: createUseEventImmediately(props),
        useComponentChange: createUseComponentChange(props),
        useAsync: createUseAsync(props),
        useImperative: createUseImperative(props),
        useChange: createUseChange(),
        useInterval: createUseInterval(props),
    };
}
