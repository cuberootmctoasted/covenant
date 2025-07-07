import { Entity, Id } from "@rbxts/jecs";
import { CovenantHooks, Discriminator } from "./hooks";
import { Remove, Delete } from "./stringEnums";
export type WorldChangesForReplication = Map<string, Delete | Map<string, defined | Remove>>;
export type WorldChangesForPrediction = Map<string, Map<string, defined | Remove>>;
export interface CovenantProps {
    replicationSend: (player: Player, worldChanges: WorldChangesForReplication) => void;
    replicationSendAll?: (worldChanges: WorldChangesForReplication) => void;
    replicationConnect: (callback: (worldChanges: WorldChangesForReplication) => void) => void;
    predictionSend: (worldChanges: WorldChangesForPrediction) => void;
    predictionConnect: (callback: (player: Player, worldChanges: WorldChangesForPrediction) => void) => void;
}
type ComponentPredictionValidator = (player: Player, entity: Entity, newState: unknown, lastState: unknown) => boolean;
export declare class Covenant {
    private _world;
    private systems;
    private worldChangesForReplication;
    private worldChangesForPrediction;
    private undefinedStringifiedComponents;
    private replicatedStringifiedComponents;
    private predictedStringifiedComponents;
    private started;
    private stringifiedComponentSubscribers;
    private stringifiedComponentValidators;
    private replicationSend;
    private replicationConnect;
    private replicationSendAll;
    private predictionSend;
    private predictionConnect;
    constructor({ replicationSend, replicationConnect, replicationSendAll, predictionSend, predictionConnect, }: CovenantProps);
    private setupPredictionClient;
    private setupPredictionServer;
    private setupPrediction;
    private setupReplicationServer;
    private setupReplicationPayload;
    private setupReplicationClient;
    private setupReplication;
    start(): void;
    private preventPostStartCall;
    private schedule;
    private worldSet;
    subscribeComponent<T>(component: Entity<T>, subscriber: (entity: Entity, state: T | undefined, previousState: T | undefined) => void): () => void;
    private worldDelete;
    worldComponent<T extends defined>(): Entity<T>;
    worldTag(): Entity<undefined>;
    private worldInternalComponent;
    private checkComponentDefined;
    private defineComponentNetworkBehavior;
    defineComputedComponent<T extends defined>({ component, queriedComponents, recipe, replicated, predictionValidator, }: {
        replicated: boolean;
        predictionValidator: ComponentPredictionValidator | false;
        component: Entity<T>;
        queriedComponents: Entity[][];
        recipe: (entity: Entity, lastState: T | undefined, updateId: number, hooks: CovenantHooks) => T | undefined;
    }): void;
    defineManagedChildren<T extends defined>({ childIdentityComponent, getIdentifier, queriedComponents, recipe, replicated, predictionValidator, }: {
        replicated: boolean;
        predictionValidator: ComponentPredictionValidator | false;
        childIdentityComponent: Entity<T>;
        getIdentifier: (state: T) => Discriminator;
        queriedComponents: Entity[][];
        recipe: (entity: Entity, lastChildrenStates: ReadonlyArray<T>, updateId: number, hooks: CovenantHooks) => ReadonlyArray<T>;
    }): void;
    defineStaticEntity<T extends defined>({ identityComponent, recipe, replicated, }: {
        replicated: boolean;
        identityComponent: Entity<T>;
        recipe: (updateId: number, hooks: CovenantHooks) => T[];
    }): void;
    private worldEntity;
    worldQuery<T extends Id[]>(...components: T): import("@rbxts/jecs").Query<import("@rbxts/jecs").InferComponents<T>>;
    worldHas(entity: Entity, ...components: Id[]): boolean;
    worldGet<T extends [Id] | [Id, Id] | [Id, Id, Id] | [Id, Id, Id, Id]>(entity: Entity, ...components: T): import("@rbxts/jecs").FlattenTuple<[...import("@rbxts/jecs").Nullable<import("@rbxts/jecs").InferComponents<T>>]>;
    worldContains(entity: Entity): boolean;
}
export {};
