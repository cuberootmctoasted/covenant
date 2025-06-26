import { Entity } from "@rbxts/jecs";
type AsyncResult<T = unknown> = {
    completed: boolean;
    value: T | undefined;
    errorMessage?: string;
};
export type Discriminator = Exclude<defined, number>;
type CovenantHook<T extends (...args: Array<any>) => defined> = (updateId: number, ...args: Parameters<T>) => ReturnType<T>;
export interface CovenantHooks {
    useEvent: CovenantHook<(<T extends Array<unknown>>(event: RBXScriptSignal<(...args: T) => void>) => T[])>;
    useEventImmediately: CovenantHook<(<T extends Array<unknown>, TReturn extends defined>(event: RBXScriptSignal<(...args: T) => void>, callback: (...args: T) => TReturn) => TReturn[])>;
    useComponentChange: CovenantHook<(<T extends defined>(component: Entity<T>) => {
        entity: Entity;
        state: T | undefined;
        previousState: T | undefined;
    }[])>;
    useAsync: CovenantHook<(<T>(asnycFactory: () => T, dependencies: unknown[], discriminator: Discriminator) => AsyncResult<T>)>;
    useImperative: CovenantHook<(<T extends defined>(dirtyFactory: (indicateUpdate: () => void) => {
        value: T;
        cleanup?: () => void;
    }, dependencies: unknown[], discriminator: Discriminator) => T)>;
    useChange: CovenantHook<(dependencies: unknown[], discriminator: Discriminator) => boolean>;
    useInterval: CovenantHook<(seconds: number, trueOnInit: boolean, discriminator: Discriminator) => boolean>;
}
interface CovenantHooksProps {
    indicateUpdate: () => void;
    subscribeComponent: <T extends defined>(component: Entity<T>, subscriber: (entity: Entity, state: T | undefined, previousState: T | undefined) => void) => void;
}
export declare function createHooks(props: CovenantHooksProps): CovenantHooks;
export {};
