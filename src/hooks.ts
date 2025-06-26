import { Entity } from "@rbxts/jecs";

type AsyncResult<T = unknown> = {
    completed: boolean;
    value: T | undefined;
    errorMessage?: string;
};
export type Discriminator = Exclude<defined, number>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CovenantHook<T extends (...args: Array<any>) => defined> = (
    updateId: number,
    ...args: Parameters<T>
) => ReturnType<T>;

export interface CovenantHooks {
    useEvent: CovenantHook<
        <T extends Array<unknown>>(
            event: RBXScriptSignal<(...args: T) => void>,
        ) => T[]
    >;
    useEventImmediately: CovenantHook<
        <T extends Array<unknown>, TReturn extends defined>(
            event: RBXScriptSignal<(...args: T) => void>,
            callback: (...args: T) => TReturn,
        ) => TReturn[]
    >;
    useComponentChange: CovenantHook<
        <T extends defined>(
            component: Entity<T>,
        ) => {
            entity: Entity;
            state: T | undefined;
            previousState: T | undefined;
        }[]
    >;
    useAsync: CovenantHook<
        <T>(
            asnycFactory: () => T,
            dependencies: unknown[],
            discriminator: Discriminator,
        ) => AsyncResult<T>
    >;
    useImperative: CovenantHook<
        <T extends defined>(
            dirtyFactory: (indicateUpdate: () => void) => {
                value: T;
                cleanup?: () => void;
            },
            dependencies: unknown[],
            discriminator: Discriminator,
        ) => T
    >;
    useChange: CovenantHook<
        (dependencies: unknown[], discriminator: Discriminator) => boolean
    >;
    useInterval: CovenantHook<
        (
            seconds: number,
            trueOnInit: boolean,
            discriminator: Discriminator,
        ) => boolean
    >;
}

interface CovenantHooksProps {
    indicateUpdate: () => void;
    subscribeComponent: <T extends defined>(
        component: Entity<T>,
        subscriber: (
            entity: Entity,
            state: T | undefined,
            previousState: T | undefined,
        ) => void,
    ) => void;
}

function withUpdateId<TParams extends Array<unknown>, TReturn extends defined>(
    fn: (...args: TParams) => TReturn,
): (id: number, ...args: TParams) => TReturn {
    let cache: TReturn | undefined = undefined;
    let lastUpdateId = -1;
    return (id: number, ...args: TParams) => {
        if (lastUpdateId !== id) {
            cache = undefined;
            lastUpdateId = id;
        }
        if (cache === undefined) {
            cache = fn(...args);
        }
        return cache;
    };
}

function createUseEvent({
    indicateUpdate,
}: CovenantHooksProps): CovenantHooks["useEvent"] {
    const queues: Map<RBXScriptSignal, defined[]> = new Map();
    const watchedEvents: Set<RBXScriptSignal> = new Set();
    const hook = <T extends Array<unknown>>(
        event: RBXScriptSignal<(...args: T) => void>,
    ): T[] => {
        if (!watchedEvents.has(event)) {
            watchedEvents.add(event);
            queues.set(event, []);
            event.Connect((...args) => {
                queues.get(event)!.push(args);
                indicateUpdate();
            });
            return [];
        }
        const queue = queues.get(event)!;
        if (!queue.isEmpty()) {
            queues.set(event, []);
        }
        return queue as T[];
    };
    return withUpdateId(hook);
}

function createUseEventImmediately({
    indicateUpdate,
}: CovenantHooksProps): CovenantHooks["useEventImmediately"] {
    const queues: Map<RBXScriptSignal, defined[]> = new Map();
    const watchedEvents: Set<RBXScriptSignal> = new Set();
    const hook = <T extends Array<unknown>, TReturn extends defined>(
        event: RBXScriptSignal<(...args: T) => void>,
        callback: (...args: T) => TReturn,
    ): TReturn[] => {
        if (!watchedEvents.has(event)) {
            watchedEvents.add(event);
            queues.set(event, []);
            event.Connect((...args) => {
                queues.get(event)!.push(callback(...args));
                indicateUpdate();
            });
            return [];
        }
        const queue = queues.get(event)!;
        if (!queue.isEmpty()) {
            queues.set(event, []);
        }
        return queue as TReturn[];
    };
    return withUpdateId(hook);
}

function createUseComponentChange({
    subscribeComponent,
    indicateUpdate: update,
}: CovenantHooksProps): CovenantHooks["useComponentChange"] {
    const queues: Map<
        string,
        { entity: Entity; state: unknown; previousState: unknown }[]
    > = new Map();
    const watchedStringifiedComponents: Set<string> = new Set();
    const hook = <T extends defined>(
        component: Entity<T>,
    ): {
        entity: Entity;
        state: T | undefined;
        previousState: T | undefined;
    }[] => {
        const stringifiedComponent = tostring(component);
        if (!watchedStringifiedComponents.has(stringifiedComponent)) {
            watchedStringifiedComponents.add(stringifiedComponent);
            queues.set(stringifiedComponent, []);
            subscribeComponent(component, (entity, state, previousState) => {
                queues
                    .get(stringifiedComponent)!
                    .push({ entity, state, previousState });
                update();
            });
            return [];
        }
        const queue = queues.get(stringifiedComponent)!;
        if (!queue.isEmpty()) {
            queues.set(stringifiedComponent, []);
        }
        return queue as {
            entity: Entity;
            state: T | undefined;
            previousState: T | undefined;
        }[];
    };
    return withUpdateId(hook);
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

function executeThread<T = unknown>(
    res: AsyncResult<T>,
    asnycFn: () => T,
    update: () => void,
) {
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

function createUseAsync({
    indicateUpdate,
}: CovenantHooksProps): CovenantHooks["useAsync"] {
    const storage: Map<
        Discriminator,
        {
            lastDependencies: unknown[];
            thread: thread;
            result: AsyncResult;
        }
    > = new Map();
    const hook = <T>(
        asnycFactory: () => T,
        dependencies: unknown[],
        discriminator: Discriminator,
    ): AsyncResult<T> => {
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
            return newResult as AsyncResult<T>;
        }
        const state = storage.get(discriminator)!;
        if (equalsDependencies(state.lastDependencies, dependencies)) {
            return state.result as AsyncResult<T>;
        } else {
            coroutine.yield(state.thread);
            coroutine.close(state.thread);
            const newResult: AsyncResult = {
                completed: false,
                value: undefined,
            };
            const newThread = coroutine.create(executeThread);
            coroutine.resume(
                newThread,
                newResult,
                asnycFactory,
                indicateUpdate,
            );
            storage.set(discriminator, {
                lastDependencies: dependencies,
                thread: newThread,
                result: newResult,
            });
            return newResult as AsyncResult<T>;
        }
    };
    return withUpdateId(hook);
}

function createUseImperative({
    indicateUpdate,
}: CovenantHooksProps): CovenantHooks["useImperative"] {
    const storage: Map<
        Discriminator,
        { cache: unknown; cleanup?: () => void; lastDependencies: unknown[] }
    > = new Map();
    const hook = <T extends defined>(
        dirtyFactory: (indicateUpdate: () => void) => {
            value: T;
            cleanup?: () => void;
        },
        dependencies: unknown[],
        discriminator: Discriminator,
    ): T => {
        if (!storage.has(discriminator)) {
            const { value, cleanup } = dirtyFactory(indicateUpdate);
            storage.set(discriminator, {
                cache: value,
                cleanup,
                lastDependencies: dependencies,
            });
            return value;
        }
        const state = storage.get(discriminator)!;
        if (equalsDependencies(state.lastDependencies, dependencies)) {
            return state.cache as T;
        } else {
            if (state.cleanup !== undefined) state.cleanup();
            const { value, cleanup } = dirtyFactory(indicateUpdate);
            storage.set(discriminator, {
                cache: value,
                cleanup,
                lastDependencies: dependencies,
            });
            return value;
        }
    };
    return withUpdateId(hook);
}

function createUseChange(): CovenantHooks["useChange"] {
    const dependenciesStorage: Map<Discriminator, unknown[]> = new Map();
    const hook = (
        dependencies: unknown[],
        discriminator: Discriminator,
    ): boolean => {
        if (!dependenciesStorage.has(discriminator)) {
            dependenciesStorage.set(discriminator, dependencies);
            return true;
        }
        const lastDependencies = dependenciesStorage.get(discriminator)!;
        if (equalsDependencies(lastDependencies, dependencies)) {
            return false;
        } else {
            dependenciesStorage.set(discriminator, dependencies);
            return true;
        }
    };
    return withUpdateId(hook);
}

function createUseInterval({
    indicateUpdate,
}: CovenantHooksProps): CovenantHooks["useInterval"] {
    const nextClocks: Map<Discriminator, number> = new Map();
    const hook = (
        seconds: number,
        trueOnInit: boolean,
        discriminator: Discriminator,
    ): boolean => {
        if (!nextClocks.has(discriminator)) {
            nextClocks.set(discriminator, os.clock() + seconds);
            task.delay(seconds, indicateUpdate);
            return trueOnInit;
        }
        const nextClock = nextClocks.get(discriminator)!;
        if (nextClock < os.clock()) {
            return false;
        } else {
            nextClocks.set(discriminator, os.clock() + seconds);
            task.delay(seconds, indicateUpdate);
            return true;
        }
    };
    return withUpdateId(hook);
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
