import { Entity } from "@rbxts/jecs";
type AsyncResult<T = unknown> = {
    completed: boolean;
    value: T | undefined;
    errorMessage?: string;
};
export type Discriminator = Exclude<defined, number>;
export interface CovenantHooks {
    useEvent: <T extends Array<unknown>>(updateId: number, event: RBXScriptSignal<(...args: T) => void>) => T[];
    useEventImmediately: <T extends Array<unknown>, TReturn extends defined>(updateId: number, event: RBXScriptSignal<(...args: T) => void>, callback: (...args: T) => TReturn) => TReturn[];
    useComponentChange: <T extends defined>(updateId: number, component: Entity<T>) => {
        entity: Entity;
        state: T | undefined;
        previousState: T | undefined;
    }[];
    useAsync: <T>(updateId: number, asnycFactory: () => T, dependencies: unknown[], discriminator: Discriminator) => AsyncResult<T>;
    useImperative: <T extends defined>(updateId: number, dirtyFactory: (indicateUpdate: () => void) => {
        value: T;
        cleanup?: () => void;
    }, dependencies: unknown[], discriminator: Discriminator) => T;
    useChange: (updateId: number, dependencies: unknown[], discriminator: Discriminator) => boolean;
    useInterval: (updateId: number, seconds: number, trueOnInit: boolean, discriminator: Discriminator) => boolean;
}
interface CovenantHooksProps {
    indicateUpdate: () => void;
    subscribeComponent: <T extends defined>(component: Entity<T>, subscriber: (entity: Entity, state: T | undefined, previousState: T | undefined) => void) => void;
}
export declare function createHooks(props: CovenantHooksProps): CovenantHooks;
export {};
