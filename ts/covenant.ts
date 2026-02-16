import { ChildOf, Entity, Id, InferComponent, pair, world, World } from "@rbxts/jecs";
import { Players, RunService } from "@rbxts/services";
import { CovenantHooks, createHooks, Discriminator } from "./hooks";
import { Remove, Delete } from "./stringEnums";
import { EventMap } from "./dataStructureWithEvents";
import { tableToString } from "./tableToString";

const BIG_PRIORITY = 10000000;

export * from "@rbxts/jecs";

// Map<Entity, Delete | Map<Component, state | Remove>>
export type WorldChangesForReplication = Map<string, Delete | Map<string, defined | Remove>>;

// Map<Component, Map<Entity, state | Remove>>
export type WorldChangesForPrediction = Map<string, Map<string, defined | Remove>>;

export type LoggingOption = "FORCE_ON" | "FORCE_OFF" | "COMPONENT_CONTROLLED";

export interface CovenantProps {
    logging: LoggingOption;
    requestPayloadSend: () => void;
    requestPayloadConnect: (callback: (player: Player) => void) => void;
    replicationSend: (player: Player, worldChanges: WorldChangesForReplication) => void;
    replicationSendAll?: (worldChanges: WorldChangesForReplication) => void;
    replicationConnect: (callback: (worldChanges: WorldChangesForReplication) => void) => void;
    predictionSend: (worldChanges: WorldChangesForPrediction) => void;
    predictionConnect: (
        callback: (player: Player, worldChanges: WorldChangesForPrediction) => void,
    ) => void;
}

type ComponentSubscriber<T extends defined = defined> = (
    entity: Entity,
    state: T | undefined,
    previousState: T | undefined,
    isDeleting: boolean,
) => void;
type ComponentPredictionValidator = (
    player: Player,
    entity: Entity,
    newState: unknown,
    lastState: unknown,
) => boolean;

export class Covenant {
    private _world: World = world();

    private systems: EventMap<{ system: () => void; priority: number }[]> = new EventMap();

    private worldChangesForReplication: WorldChangesForReplication = new Map();
    private worldChangesForPrediction: WorldChangesForPrediction = new Map();

    private stringfiedComponents: Set<string> = new Set();
    private undefinedStringifiedComponents: Set<string> = new Set();
    private replicatedStringifiedComponents: Set<string> = new Set();
    private predictedStringifiedComponents: Set<string> = new Set();

    private loggingStringfiedComponents: Set<string> = new Set();

    private stringfiedComponentsToNameMap: Map<string, string> = new Map();

    private started = false;

    private stringifiedComponentSubscribers: Map<string, Set<ComponentSubscriber>> = new Map();
    private stringifiedComponentValidators: Map<string, ComponentPredictionValidator> = new Map();

    private clientToServerEntityMap: Map<string, Entity> = new Map();
    private serverToClientEntityMap: Map<string, Entity> = new Map();

    private requestPayloadSend: CovenantProps["requestPayloadSend"];
    private requestPayloadConnect: CovenantProps["requestPayloadConnect"];
    private replicationSend: CovenantProps["replicationSend"];
    private replicationConnect: CovenantProps["replicationConnect"];
    private replicationSendAll: CovenantProps["replicationSendAll"];
    private predictionSend: CovenantProps["predictionSend"];
    private predictionConnect: CovenantProps["predictionConnect"];

    constructor({
        logging,
        requestPayloadSend,
        requestPayloadConnect,
        replicationSend,
        replicationConnect,
        replicationSendAll,
        predictionSend,
        predictionConnect,
    }: CovenantProps) {
        this.loggingOption = logging;

        this.requestPayloadSend = requestPayloadSend;
        this.requestPayloadConnect = requestPayloadConnect;
        this.replicationSend = replicationSend;
        this.replicationConnect = replicationConnect;
        this.replicationSendAll = replicationSendAll;
        this.predictionSend = predictionSend;
        this.predictionConnect = predictionConnect;

        this.setupReplication();
        this.setupPrediction();
    }

    public getClientEntity(entity: Entity) {
        return this.serverToClientEntityMap.get(tostring(entity));
    }

    public getServerEntity(entity: Entity) {
        return this.clientToServerEntityMap.get(tostring(entity));
    }

    private loggingOption: LoggingOption;

    private setupPredictionClient() {
        this.schedule(
            RunService.Heartbeat,
            () => {
                if (this.worldChangesForPrediction.isEmpty()) return;
                const currentWorldChanges = this.worldChangesForPrediction;
                this.worldChangesForPrediction = new Map();
                this.predictionSend(currentWorldChanges);
            },
            BIG_PRIORITY + 1,
        );
    }

    private forEachComponentChanges(
        player: Player,
        worldReconciliation: WorldChangesForReplication,
        componentChanges: Map<string, defined | Remove>,
        stringifiedComponent: string,
    ) {
        const component = tonumber(stringifiedComponent) as Entity;
        const validator = this.stringifiedComponentValidators.get(stringifiedComponent);
        if (!validator) return;
        componentChanges.forEach((state, stringifiedEntity) => {
            const entity = tonumber(stringifiedEntity) as Entity;
            if (!this.worldContains(entity)) return;
            const newState = state === Remove ? undefined : state;
            const lastState = this.worldGet(entity, component);
            const valid = validator(player, entity, newState, lastState);
            if (valid) {
                this.worldSet(entity, component, newState);
            } else {
                let entityReconciliations = worldReconciliation.get(stringifiedEntity);
                assert(entityReconciliations !== Delete);
                if (entityReconciliations === undefined) {
                    entityReconciliations = new Map();
                    worldReconciliation.set(stringifiedEntity, entityReconciliations);
                }
                entityReconciliations.set(
                    stringifiedComponent,
                    this.worldHas(entity, component) ? this.worldGet(entity, component)! : Remove,
                );
            }
        });
    }

    private setupPredictionServer() {
        const changes: [Player, WorldChangesForPrediction][] = [];

        this.predictionConnect((player, worldChanges) => {
            changes.push([player, worldChanges]);
        });
        this.schedule(
            RunService.Heartbeat,
            () => {
                if (changes.isEmpty()) return;
                changes.forEach(([player, worldChanges]) => {
                    const worldReconciliation: WorldChangesForReplication = new Map();

                    worldChanges.forEach((componentChanges, stringifiedComponent) => {
                        this.forEachComponentChanges(
                            player,
                            worldReconciliation,
                            componentChanges,
                            stringifiedComponent,
                        );
                    });

                    if (!worldReconciliation.isEmpty()) {
                        this.replicationSend(player, worldReconciliation);
                    }
                });
                changes.clear();
            },
            BIG_PRIORITY,
        );
    }

    private setupPrediction() {
        if (RunService.IsClient()) {
            this.setupPredictionClient();
        }
        if (RunService.IsServer()) {
            this.setupPredictionServer();
        }
    }

    private setupReplicationServer() {
        this.schedule(
            RunService.Heartbeat,
            () => {
                if (this.worldChangesForReplication.isEmpty()) return;
                const currentWorldChanges = this.worldChangesForReplication;
                this.worldChangesForReplication = new Map();
                if (this.replicationSendAll !== undefined) {
                    this.replicationSendAll(currentWorldChanges);
                } else {
                    Players.GetPlayers().forEach((player) => {
                        this.replicationSend(player, currentWorldChanges);
                    });
                }
            },
            BIG_PRIORITY + 1,
        );
    }

    private setupReplicationPayload() {
        this.requestPayloadConnect((player) => {
            task.defer(() => {
                if (!player.IsDescendantOf(Players)) return;

                const worldPayload: WorldChangesForReplication = new Map();
                this.replicatedStringifiedComponents.forEach((stringifiedComponent) => {
                    const component = tonumber(stringifiedComponent) as Entity;
                    for (const [entity, state] of this.worldQuery(component)) {
                        let entityData = worldPayload.get(tostring(entity));
                        if (entityData === undefined) {
                            entityData = new Map();
                            worldPayload.set(tostring(entity), entityData);
                        }
                        assert(entityData !== Delete);
                        entityData.set(stringifiedComponent, state as defined);
                    }
                });
                this.replicationSend(player, worldPayload);
            });
        });
    }

    private setupReplicationClient() {
        const changes: WorldChangesForReplication[] = [];
        this.replicationConnect((worldChanges) => {
            changes.push(worldChanges);
        });
        this.schedule(
            RunService.Heartbeat,
            () => {
                if (changes.isEmpty()) return;
                changes.forEach((worldChanges) => {
                    worldChanges.forEach((entityData, stringifiedServerEntity) => {
                        let entity = this.serverToClientEntityMap.get(stringifiedServerEntity);
                        if (entityData === Delete) {
                            if (entity !== undefined) {
                                this.worldDelete(entity);
                            }
                            this.serverToClientEntityMap.delete(stringifiedServerEntity);
                            this.clientToServerEntityMap.delete(tostring(entity));
                            return;
                        }
                        if (entity === undefined) {
                            entity = this._world.entity();
                            this.serverToClientEntityMap.set(stringifiedServerEntity, entity);
                            this.clientToServerEntityMap.set(
                                tostring(entity),
                                tonumber(stringifiedServerEntity) as Entity,
                            );
                        }
                        entityData.forEach((state, stringifiedComponent) => {
                            const component = tonumber(stringifiedComponent) as Entity<defined>;
                            if (state === Remove) {
                                this.worldSet(entity, component, undefined, true);
                            } else {
                                this.worldSet(entity, component, state, true);
                            }
                        });
                    });
                });
                changes.clear();
            },
            BIG_PRIORITY,
        );
    }

    private setupReplication() {
        if (RunService.IsServer()) {
            this.setupReplicationServer();
            this.setupReplicationPayload();
        }
        if (RunService.IsClient()) {
            this.setupReplicationClient();
        }
    }

    public start() {
        assert(!this.started, "Already started");
        if (!this.undefinedStringifiedComponents.isEmpty()) {
            warn(
                `There are ${this.undefinedStringifiedComponents.size()} components that are not defined`,
            );
        }
        this.started = true;
        this.systems.forEach((systemsOfEvent, event) =>
            this.systems.set(
                event,
                systemsOfEvent.sort((a, b) => {
                    return a.priority < b.priority;
                }),
            ),
        );
        this.systems.forEach((systemsOfEvent, event) => {
            event.Connect(() => {
                systemsOfEvent.forEach(({ system }) => {
                    system();
                });
            });
        });
        if (RunService.IsClient()) {
            this.requestPayloadSend();
        }
    }

    private preventPostStartCall() {
        assert(!this.started, "Attempted to schedule system after starting");
    }

    private schedule(event: RBXScriptSignal, system: () => void, priority: number = 0) {
        this.preventPostStartCall();

        let systemsOfEvent = this.systems.get(event);
        if (systemsOfEvent === undefined) {
            systemsOfEvent = [];
            this.systems.set(event, systemsOfEvent);
        }
        systemsOfEvent.push({ system, priority });
    }

    private worldSet<E extends Id<unknown>>(
        entity: Entity,
        component: E,
        newState: InferComponent<E> | undefined,
        doNotReconcile = false,
    ) {
        const lastState = this.worldGet(entity, component);
        if (newState === lastState) return;
        if (newState === undefined) {
            this._world.remove(entity, component);
        } else {
            this._world.set(entity, component, newState);
        }
        if (
            RunService.IsStudio() &&
            this.loggingOption !== "FORCE_OFF" &&
            (this.loggingOption === "FORCE_ON" ||
                this.loggingStringfiedComponents.has(tostring(component)))
        ) {
            print(
                `${this.getComponentName(component as Entity)}.${entity}.[${doNotReconcile ? "remote" : "local"}]:${tableToString(lastState)}->${tableToString(newState)}`,
            );
        }
        this.stringifiedComponentSubscribers.get(tostring(component))?.forEach((subscriber) => {
            subscriber(
                entity,
                newState as defined | undefined,
                lastState as defined | undefined,
                false,
            );
        });
        if (doNotReconcile) return;
        if (
            RunService.IsServer() &&
            this.replicatedStringifiedComponents.has(tostring(component))
        ) {
            let entityChanges = this.worldChangesForReplication.get(tostring(entity));
            if (entityChanges === undefined) {
                entityChanges = new Map();
                this.worldChangesForReplication.set(tostring(entity), entityChanges);
            }
            if (entityChanges !== Delete) {
                entityChanges.set(
                    tostring(component),
                    newState !== undefined ? (newState as defined) : Remove,
                );
            }
        }
        if (RunService.IsClient() && this.predictedStringifiedComponents.has(tostring(component))) {
            let componentChanges = this.worldChangesForPrediction.get(tostring(component));
            if (componentChanges === undefined) {
                componentChanges = new Map();
                this.worldChangesForPrediction.set(tostring(component), componentChanges);
            }
            const serverEntity = this.clientToServerEntityMap.get(tostring(entity));
            if (serverEntity !== undefined) {
                componentChanges.set(
                    tostring(serverEntity),
                    newState !== undefined ? (newState as defined) : Remove,
                );
            }
        }
    }

    public subscribeComponent<T extends defined>(
        component: Entity<T>,
        subscriber: ComponentSubscriber<T>,
    ) {
        let subscribers = this.stringifiedComponentSubscribers.get(tostring(component));
        if (subscribers === undefined) {
            subscribers = new Set();
            this.stringifiedComponentSubscribers.set(tostring(component), subscribers);
        }
        const subscriberElement = subscriber as (
            entity: Entity,
            state: unknown,
            previousState: unknown,
        ) => void;
        subscribers.add(subscriberElement);
        return () => {
            subscribers.delete(subscriberElement);
        };
    }

    private worldDelete(entity: Entity) {
        if (!this.worldContains(entity)) return;

        this.stringfiedComponents.forEach((cString) => {
            const c = tonumber(cString) as Entity;
            if (this.worldHas(entity, c)) {
                const lastState = this.worldGet(entity, c) as defined | undefined;
                this.stringifiedComponentSubscribers.get(tostring(c))?.forEach((subscriber) => {
                    subscriber(entity, undefined, lastState, true);
                });
            }
        });

        this._world.delete(entity);
        if (RunService.IsServer()) {
            this.worldChangesForReplication.set(tostring(entity), Delete);
        }
    }

    public worldComponent<T extends defined>(name: string) {
        this.preventPostStartCall();
        const c = this._world.component<T>();
        const cStr = tostring(c);
        this.stringfiedComponentsToNameMap.set(cStr, name);
        this.undefinedStringifiedComponents.add(cStr);
        this.stringfiedComponents.add(cStr);
        return c;
    }

    public getComponentName(component: Entity) {
        return this.stringfiedComponentsToNameMap.get(tostring(component))!;
    }

    public worldTag() {
        this.preventPostStartCall();
        const c = this._world.component<undefined>();
        this.undefinedStringifiedComponents.add(tostring(c));
        return c;
    }

    private checkComponentDefined(component: Entity) {
        assert(
            this.undefinedStringifiedComponents.has(tostring(component)),
            `Component ${component} is already defined`,
        );
        this.undefinedStringifiedComponents.delete(tostring(component));
    }

    private defineComponentNetworkBehavior(
        component: Entity,
        replicated: boolean,
        predictionValidator: ComponentPredictionValidator | false,
    ) {
        if (replicated) {
            this.replicatedStringifiedComponents.add(tostring(component));
        }
        if (predictionValidator) {
            this.predictedStringifiedComponents.add(tostring(component));
            this.stringifiedComponentValidators.set(tostring(component), predictionValidator);
        }
    }

    public defineComponent<T extends defined>({
        logging,
        component,
        queriedComponents,
        recipe,
        replicated,
        predictionValidator,
    }: {
        logging?: true;
        replicated: boolean;
        predictionValidator: ComponentPredictionValidator | false;
        component: Entity<T>;
        queriedComponents: Entity[][];
        recipe: (
            entity: Entity,
            lastState: T | undefined,
            updateId: number,
            hooks: CovenantHooks,
        ) => T | undefined;
    }) {
        this.checkComponentDefined(component);

        this.defineComponentNetworkBehavior(component, replicated, predictionValidator);

        if (logging) {
            this.loggingStringfiedComponents.add(tostring(component));
        }

        const queryThisComponent = this.worldQuery(component).cached();

        let willUpdate = true;
        function indicateUpdate() {
            willUpdate = true;
        }

        const hooks = createHooks({
            indicateUpdate,
            covenant: this,
        });

        const queries = queriedComponents.map((components) => {
            return this.worldQuery(...components).cached();
        });

        [
            ...queriedComponents.reduce((accum, components) => {
                components.forEach((component) => {
                    const stringifiedComponent = tostring(component);
                    accum.add(stringifiedComponent);
                });
                return accum;
            }, new Set<string>()),
        ]
            .map((stringifiedComponent) => {
                return tonumber(stringifiedComponent) as Entity;
            })
            .forEach((component) => {
                this.subscribeComponent(component as Entity<defined>, indicateUpdate);
            });

        let lastUpdateId = 0;
        const updater = () => {
            const updateId = ++lastUpdateId;
            const unhandledStringifiedEntities: Set<string> = new Set();
            const handledStringifiedEntities: Set<string> = new Set();
            for (const [entity] of queryThisComponent) {
                unhandledStringifiedEntities.add(tostring(entity));
            }
            queries.forEach((query) => {
                for (const [entity] of query) {
                    const stringifiedEntity = tostring(entity);
                    if (handledStringifiedEntities.has(stringifiedEntity)) continue;
                    handledStringifiedEntities.add(stringifiedEntity);
                    unhandledStringifiedEntities.delete(stringifiedEntity);

                    const lastState = this.worldGet(entity, component);
                    const newState = recipe(entity, lastState, updateId, hooks);
                    this.worldSet(entity, component, newState);
                }
            });
            unhandledStringifiedEntities.forEach((stringifiedEntity) => {
                const entity = tonumber(stringifiedEntity) as Entity;
                this.worldSet(entity, component, undefined);
            });
        };

        this.schedule(RunService.Heartbeat, () => {
            if (!willUpdate) return;
            willUpdate = false;
            updater();
        });
    }

    public defineIdentity<T extends defined>({
        logging,
        identityComponent,
        replicated,
        lifetime,
        factory,
    }: {
        logging?: true;
        identityComponent: Entity<T>;
        replicated: boolean;
        lifetime: (entity: Entity, state: T, despawn: () => void) => (() => void) | undefined;
        factory: (spawnEntity: (state: T) => void) => void;
    }) {
        this.checkComponentDefined(identityComponent);

        if (logging) {
            this.loggingStringfiedComponents.add(tostring(identityComponent));
        }

        this.defineComponentNetworkBehavior(identityComponent, replicated, false);

        factory((state) => {
            const entity = this.worldEntity();
            this.worldSet(entity, identityComponent, state);
            let cleanup: (() => void) | undefined = () => {};
            cleanup = lifetime(entity, state, () => {
                this.worldDelete(entity);
                if (cleanup !== undefined) cleanup();
            });
        });
    }

    private worldEntity(): Entity {
        return this._world.entity();
    }

    public worldQuery<T extends Id[]>(...components: T) {
        return this._world.query(...components);
    }

    public worldHas(entity: Entity, ...components: Id[]) {
        return this._world.has(entity, ...components);
    }

    public worldGet<T extends [Id] | [Id, Id] | [Id, Id, Id] | [Id, Id, Id, Id]>(
        entity: Entity,
        ...components: T
    ) {
        return this._world.get(entity, ...components);
    }

    public worldContains(entity: Entity): boolean {
        return this._world.contains(entity);
    }
}
