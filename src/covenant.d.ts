import { Entity, Id } from "@rbxts/jecs";
import { CovenantHooks, Discriminator } from "./hooks";
import { Remove, Delete } from "./stringEnums";
export * from "@rbxts/jecs";
export type WorldChangesForReplication = Map<string, Delete | Map<string, defined | Remove>>;
export type WorldChangesForPrediction = Map<string, Map<string, defined | Remove>>;
export interface CovenantProps {
    logging: boolean;
    requestPayloadSend: () => void;
    requestPayloadConnect: (callback: (player: Player) => void) => void;
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
    private requestPayloadSend;
    private requestPayloadConnect;
    private replicationSend;
    private replicationConnect;
    private replicationSendAll;
    private predictionSend;
    private predictionConnect;
    constructor({ logging, requestPayloadSend, requestPayloadConnect, replicationSend, replicationConnect, replicationSendAll, predictionSend, predictionConnect, }: CovenantProps);
    private logging;
    enableLogging(): void;
    disableLogging(): void;
    private setupPredictionClient;
    private forEachComponentChanges;
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
    private checkComponentDefined;
    private defineComponentNetworkBehavior;
    defineComponent<T extends defined>({ component, queriedComponents, recipe, replicated, predictionValidator, }: {
        replicated: boolean;
        predictionValidator: ComponentPredictionValidator | false;
        component: Entity<T>;
        queriedComponents: Entity[][];
        recipe: (entity: Entity, lastState: T | undefined, updateId: number, hooks: CovenantHooks) => T | undefined;
    }): void;
    defineIdentity<T extends Discriminator>({ identityComponent, recipe, replicated, }: {
        replicated: boolean;
        identityComponent: Entity<T>;
        recipe: (entities: ReadonlyMap<T, Entity>, updateId: number, hooks: CovenantHooks) => {
            statesToCreate?: T[];
            statesToDelete?: T[];
        } | undefined;
    }): void;
    private worldEntity;
    worldQuery<T extends Id[]>(...components: T): import("@rbxts/jecs").Query<import("@rbxts/jecs").InferComponents<T>>;
    worldHas(entity: Entity, ...components: Id[]): boolean;
    worldGet<T extends [Id] | [Id, Id] | [Id, Id, Id] | [Id, Id, Id, Id]>(entity: Entity, ...components: T): import("@rbxts/jecs").FlattenTuple<[...import("@rbxts/jecs").Nullable<import("@rbxts/jecs").InferComponents<T>>]>;
    worldContains(entity: Entity): boolean;
}
