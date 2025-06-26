import { ChildOf, Entity, Id, InferComponent, pair, World } from "@rbxts/jecs";
import { Players, RunService } from "@rbxts/services";
import { CovenantHooks, createHooks, Discriminator } from "./hooks";
import { Remove, Delete } from "./stringEnums";
import { compareMaps, turnArrayWithIdentifierToMap } from "./helpers";

// Map<Entity, Delete | Map<Component, state | Remove>>
export type WorldChangesForReplication = Map<
    string,
    Delete | Map<string, defined | Remove>
>;

// Map<Component, Map<Entity, state | Remove>>
export type WorldChangesForPrediction = Map<
    string,
    Map<string, defined | Remove>
>;

export interface CovenantProps {
    replicationSend: (
        player: Player,
        worldChanges: WorldChangesForReplication,
    ) => void;
    replicationSendAll?: (worldChanges: WorldChangesForReplication) => void;
    replicationConnect: (
        callback: (worldChanges: WorldChangesForReplication) => void,
    ) => void;
    predictionSend: (worldChanges: WorldChangesForPrediction) => void;
    predictionConnect: (
        callback: (
            player: Player,
            worldChanges: WorldChangesForPrediction,
        ) => void,
    ) => void;
}

function createWorldWithRange(
    minClientEntity: number,
    maxClientEntity: number,
) {
    const world = new World();
    if (RunService.IsClient()) {
        world.range(minClientEntity, maxClientEntity);
    }
    if (RunService.IsServer()) {
        world.range(maxClientEntity);
    }
    return world;
}

type ComponentSubscriber<T extends defined = defined> = (
    entity: Entity,
    state: T | undefined,
    previousState: T | undefined,
) => void;
type ComponentPredictionValidator = (
    player: Player,
    entity: Entity,
    newState: unknown,
    lastState: unknown,
) => boolean;

export class Covenant {
    private _world: World = createWorldWithRange(1000, 20000);

    private systems: Map<
        RBXScriptSignal,
        { system: () => void; priority: number }[]
    > = new Map();

    private worldChangesForReplication: WorldChangesForReplication = new Map();
    private worldChangesForPrediction: WorldChangesForPrediction = new Map();

    private underivedStringifiedComponents: Set<string> = new Set();
    private replicatedStringifiedComponents: Set<string> = new Set();
    private predictedStringifiedComponents: Set<string> = new Set();

    private started = false;

    private stringifiedComponentSubscribers: Map<
        string,
        Set<ComponentSubscriber>
    > = new Map();
    private stringifiedComponentValidators: Map<
        string,
        ComponentPredictionValidator
    > = new Map();

    private replicationSend: CovenantProps["replicationSend"];
    private replicationConnect: CovenantProps["replicationConnect"];
    private replicationSendAll: CovenantProps["replicationSendAll"];
    private predictionSend: CovenantProps["predictionSend"];
    private predictionConnect: CovenantProps["predictionConnect"];

    constructor({
        replicationSend,
        replicationConnect,
        replicationSendAll,
        predictionSend,
        predictionConnect,
    }: CovenantProps) {
        this.replicationSend = replicationSend;
        this.replicationConnect = replicationConnect;
        this.replicationSendAll = replicationSendAll;
        this.predictionSend = predictionSend;
        this.predictionConnect = predictionConnect;

        this.setupReplication();
        this.setupPrediction();
    }

    private setupPredictionClient() {
        this.schedule(
            RunService.Heartbeat,
            () => {
                if (this.worldChangesForPrediction.isEmpty()) return;
                const currentWorldChanges = this.worldChangesForPrediction;
                this.worldChangesForPrediction = new Map();
                this.predictionSend(currentWorldChanges);
            },
            math.huge,
        );
    }

    private setupPredictionServer() {
        this.predictionConnect((player, worldChanges) => {
            const worldReconciliation: WorldChangesForReplication = new Map();

            worldChanges.forEach((componentChanges, stringifiedComponent) => {
                const component = tonumber(stringifiedComponent) as Entity;
                const validator =
                    this.stringifiedComponentValidators.get(
                        stringifiedComponent,
                    );
                if (!validator) return;
                componentChanges.forEach((state, stringifiedEntity) => {
                    const entity = tonumber(stringifiedEntity) as Entity;
                    if (!this.worldContains(entity)) return;
                    const newState = state === Remove ? undefined : state;
                    const lastState = this.worldGet(entity, component);
                    const valid = validator(
                        player,
                        entity,
                        newState,
                        lastState,
                    );
                    if (valid) {
                        this.worldSet(entity, component, newState);
                    } else {
                        let entityReconciliations =
                            worldReconciliation.get(stringifiedEntity);
                        assert(entityReconciliations !== Delete);
                        if (entityReconciliations === undefined) {
                            entityReconciliations = new Map();
                            worldReconciliation.set(
                                stringifiedEntity,
                                entityReconciliations,
                            );
                        }
                        entityReconciliations.set(
                            stringifiedComponent,
                            this.worldGet(entity, component) ?? Remove,
                        );
                    }
                });
            });

            if (!worldReconciliation.isEmpty()) {
                this.replicationSend(player, worldReconciliation);
            }
        });
    }

    private setupPrediction() {
        if (RunService.IsClient()) {
            this.setupPredictionClient();
        }
        if (RunService.IsServer()) {
            this.setupPredictionServer();
        }
    }

    private setupRelicationServer() {
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
            math.huge,
        );
    }

    private setupReplicationPayload() {
        Players.PlayerAdded.Connect((player) => {
            task.defer(() => {
                if (!player.IsDescendantOf(Players)) return;

                const worldPayload: WorldChangesForReplication = new Map();
                this.replicatedStringifiedComponents.forEach(
                    (stringifiedComponent) => {
                        const component = tonumber(
                            stringifiedComponent,
                        ) as Entity;
                        for (const [entity, state] of this.worldQuery(
                            component,
                        )) {
                            let entityData = worldPayload.get(tostring(entity));
                            if (entityData === undefined) {
                                entityData = new Map();
                                worldPayload.set(tostring(entity), entityData);
                            }
                            assert(entityData !== Delete);
                            entityData.set(
                                stringifiedComponent,
                                state as defined,
                            );
                        }
                    },
                );
                this.replicationSend(player, worldPayload);
            });
        });
    }

    private setupReplicationClient() {
        this.replicationConnect((worldChanges) => {
            worldChanges.forEach((entityData, stringifiedEntity) => {
                const entity = tonumber(stringifiedEntity) as Entity;
                if (entityData === Delete) {
                    this.worldDelete(entity);
                    return;
                }
                entityData.forEach((state, stringifiedComponent) => {
                    const component = tonumber(
                        stringifiedComponent,
                    ) as Entity<defined>;
                    if (state === Remove) {
                        this.worldSet(entity, component, undefined, true);
                    } else {
                        this.worldSet(entity, component, state, true);
                    }
                });
            });
        });
    }

    private setupReplication() {
        if (RunService.IsServer()) {
            this.setupRelicationServer();
            this.setupReplicationPayload();
        }
        if (RunService.IsClient()) {
            this.setupReplicationClient();
        }
    }

    public start() {
        assert(!this.started, "Already started");
        assert(
            this.underivedStringifiedComponents.isEmpty(),
            `There are ${this.underivedStringifiedComponents.size()} components that are not derived`,
        );
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
    }

    private schedule(
        event: RBXScriptSignal,
        system: () => void,
        priority: number = 0,
    ) {
        assert(!this.started, "Attempted to schedule system after starting");
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
        if (!this.worldContains(entity)) {
            this._world.entity(entity);
        }
        const lastState = this.worldGet(entity, component);
        if (newState === lastState) return;
        if (newState === undefined) {
            this._world.remove(entity, component);
        } else {
            this._world.set(entity, component, newState);
        }
        this.stringifiedComponentSubscribers
            .get(tostring(component))
            ?.forEach((subscriber) => {
                subscriber(
                    entity,
                    newState as defined | undefined,
                    lastState as defined | undefined,
                );
            });
        if (doNotReconcile) return;
        if (this.replicatedStringifiedComponents.has(tostring(component))) {
            let entityChanges = this.worldChangesForReplication.get(
                tostring(entity),
            );
            if (entityChanges === undefined) {
                entityChanges = new Map();
                this.worldChangesForReplication.set(
                    tostring(entity),
                    entityChanges,
                );
            }
            if (entityChanges !== Delete) {
                entityChanges.set(tostring(component), newState ?? Remove);
            }
        }
        if (
            RunService.IsClient() &&
            this.predictedStringifiedComponents.has(tostring(component))
        ) {
            let componentChanges = this.worldChangesForPrediction.get(
                tostring(component),
            );
            if (componentChanges === undefined) {
                componentChanges = new Map();
                this.worldChangesForPrediction.set(
                    tostring(component),
                    componentChanges,
                );
            }
            componentChanges.set(tostring(entity), newState ?? Remove);
        }
    }

    public subscribeComponent<T>(
        component: Entity<T>,
        subscriber: (
            entity: Entity,
            state: T | undefined,
            previousState: T | undefined,
        ) => void,
    ) {
        let subscribers = this.stringifiedComponentSubscribers.get(
            tostring(component),
        );
        if (subscribers === undefined) {
            subscribers = new Set();
            this.stringifiedComponentSubscribers.set(
                tostring(component),
                subscribers,
            );
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

        const toDelete: Entity[] = [entity];
        const processed: Set<Entity> = new Set();

        while (toDelete.size() > 0) {
            const currentEntity = toDelete.pop()!;
            if (
                processed.has(currentEntity) ||
                !this.worldContains(currentEntity)
            ) {
                continue;
            }
            processed.add(currentEntity);

            for (const [childEntity] of this.worldQuery(
                pair(ChildOf, currentEntity),
            )) {
                toDelete.push(childEntity);
            }
        }

        processed.forEach((entityToDelete) => {
            this._world.delete(entityToDelete);
            this.worldChangesForReplication.set(
                tostring(entityToDelete),
                Delete,
            );
        });
    }

    public worldComponent<T extends defined>() {
        const c = this._world.component<T>();
        return c;
    }

    private checkComponentDerived(component: Entity) {
        assert(
            this.underivedStringifiedComponents.has(tostring(component)),
            `Component ${component} is already derived`,
        );
        this.underivedStringifiedComponents.delete(tostring(component));
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
            this.stringifiedComponentValidators.set(
                tostring(component),
                predictionValidator,
            );
        }
    }

    public deriveComponent<T extends defined>({
        component,
        queriedComponents,
        recipe,
        replicated,
        predictionValidator,
    }: {
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
        this.checkComponentDerived(component);

        this.defineComponentNetworkBehavior(
            component,
            replicated,
            predictionValidator,
        );

        const queryThisComponent = this.worldQuery(component).cached();

        let willUpdate = true;
        function indicateUpdate() {
            willUpdate = true;
        }

        const hooks = createHooks({
            indicateUpdate,
            subscribeComponent: <T extends defined>(
                component: Entity<T>,
                subscriber: ComponentSubscriber<T>,
            ) => {
                this.subscribeComponent(component, subscriber);
            },
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
                this.subscribeComponent(component, indicateUpdate);
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
                    if (handledStringifiedEntities.has(stringifiedEntity))
                        continue;
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

    public deriveChildren<T extends defined>({
        parentComponent,
        parentEntityTrackerComponent,
        childIdentityComponent,
        getIdentifier,
        queriedComponents,
        recipe,
        replicated,
        predictionValidator,
    }: {
        replicated: boolean;
        predictionValidator: ComponentPredictionValidator | false;
        parentComponent: Entity<ReadonlyArray<T>>;
        parentEntityTrackerComponent: Entity<Map<Discriminator, Entity>>;
        childIdentityComponent: Entity<T>;
        getIdentifier: (state: T) => Discriminator;
        queriedComponents: Entity[][];
        recipe: (
            entity: Entity,
            lastChildrenStates: ReadonlyArray<T>,
            updateId: number,
            hooks: CovenantHooks,
        ) => ReadonlyArray<T>;
    }) {
        this.checkComponentDerived(parentComponent);
        this.checkComponentDerived(parentEntityTrackerComponent);
        this.checkComponentDerived(childIdentityComponent);

        this.defineComponentNetworkBehavior(
            parentComponent,
            replicated,
            predictionValidator,
        );

        const queryParentComponent = this.worldQuery(parentComponent).cached();

        let willUpdate = true;
        function indicateUpdate() {
            willUpdate = true;
        }

        const hooks = createHooks({
            indicateUpdate,
            subscribeComponent: <T extends defined>(
                component: Entity<T>,
                subscriber: ComponentSubscriber<T>,
            ) => {
                this.subscribeComponent(component, subscriber);
            },
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
                this.subscribeComponent(component, indicateUpdate);
            });

        let lastUpdateId = 0;
        const updater = () => {
            const updateId = ++lastUpdateId;
            const unhandledStringifiedEntities: Set<string> = new Set();
            const handledStringifiedEntities: Set<string> = new Set();
            for (const [entity] of queryParentComponent) {
                unhandledStringifiedEntities.add(tostring(entity));
            }
            queries.forEach((query) => {
                for (const [entity] of query) {
                    const stringifiedEntity = tostring(entity);
                    if (handledStringifiedEntities.has(stringifiedEntity))
                        continue;
                    handledStringifiedEntities.add(stringifiedEntity);
                    unhandledStringifiedEntities.delete(stringifiedEntity);

                    let entityTracker = this.worldGet(
                        entity,
                        parentEntityTrackerComponent,
                    );
                    if (entityTracker === undefined) {
                        entityTracker = new Map();
                        this.worldSet(
                            entity,
                            parentEntityTrackerComponent,
                            entityTracker,
                        );
                    }

                    const lastState =
                        this.worldGet(entity, parentComponent) ?? [];
                    const newState = recipe(entity, lastState, updateId, hooks);
                    this.worldSet(entity, parentComponent, newState);

                    const lastStateMap = turnArrayWithIdentifierToMap(
                        lastState,
                        getIdentifier,
                    );
                    const newStateMap = turnArrayWithIdentifierToMap(
                        newState,
                        getIdentifier,
                    );
                    const { entriesChanged, entriesAdded, keysRemoved } =
                        compareMaps(lastStateMap, newStateMap);
                    entriesAdded.forEach(({ key, value }) => {
                        const childEntity = this.worldEntity();
                        entityTracker.set(key, childEntity);
                        this.worldSet(
                            childEntity,
                            childIdentityComponent,
                            value,
                        );
                        this._world.add(childEntity, pair(ChildOf, entity));
                    });
                    entriesChanged.forEach(({ key, value }) => {
                        const childEntity = entityTracker.get(key);
                        assert(childEntity);
                        assert(this.worldContains(childEntity));
                        this.worldSet(
                            childEntity,
                            childIdentityComponent,
                            value,
                        );
                    });
                    keysRemoved.forEach((key) => {
                        const childEntity = entityTracker.get(key);
                        assert(childEntity);
                        assert(this.worldContains(childEntity));
                        this.worldDelete(childEntity);
                        entityTracker.delete(key);
                    });
                }
            });
            unhandledStringifiedEntities.forEach((stringifiedEntity) => {
                const entity = tonumber(stringifiedEntity) as Entity;

                const children = this.worldGet(
                    entity,
                    parentEntityTrackerComponent,
                );
                if (children !== undefined) {
                    children.forEach((childEntity) => {
                        this.worldDelete(childEntity);
                    });
                }

                this.worldSet(entity, parentComponent, undefined);
                this.worldSet(entity, parentEntityTrackerComponent, undefined);
            });
        };

        this.schedule(RunService.Heartbeat, () => {
            if (!willUpdate) return;
            willUpdate = false;
            updater();
        });
    }

    public deriveRootEntity<T extends defined>({
        identityComponent,
        recipe,
        replicated,
    }: {
        replicated: boolean;
        identityComponent: Entity<T>;
        recipe: (
            updateId: number,
            hooks: CovenantHooks,
        ) => {
            statesToCreate: ReadonlyArray<T>;
            entitiesToDelete: ReadonlyArray<Entity>;
        };
    }) {
        this.checkComponentDerived(identityComponent);

        this.defineComponentNetworkBehavior(
            identityComponent,
            replicated,
            false,
        );

        let willUpdate = true;
        function indicateUpdate() {
            willUpdate = true;
        }

        const hooks = createHooks({
            indicateUpdate,
            subscribeComponent: <T extends defined>(
                component: Entity<T>,
                subscriber: ComponentSubscriber<T>,
            ) => {
                this.subscribeComponent(component, subscriber);
            },
        });

        let lastUpdateId = 0;
        const updater = () => {
            const { statesToCreate, entitiesToDelete } = recipe(
                ++lastUpdateId,
                hooks,
            );
            statesToCreate.forEach((state) => {
                const entity = this.worldEntity();
                this.worldSet(entity, identityComponent, state);
            });
            entitiesToDelete.forEach((entity) => {
                this.worldDelete(entity);
            });
        };

        this.schedule(RunService.Heartbeat, () => {
            if (!willUpdate) return;
            willUpdate = false;
            updater();
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

    public worldGet<
        T extends [Id] | [Id, Id] | [Id, Id, Id] | [Id, Id, Id, Id],
    >(entity: Entity, ...components: T) {
        return this._world.get(entity, ...components);
    }

    public worldContains(entity: Entity): boolean {
        return this._world.contains(entity);
    }
}
