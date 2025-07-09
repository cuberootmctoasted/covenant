import { Discriminator } from "./hooks";

export declare function turnArrayWithIdentifierToMap<T extends defined>(
    array: ReadonlyArray<T>,
    getIdentifier: (state: T) => Discriminator,
): Map<defined, T>;
export declare function compareMaps<TKey extends Discriminator, TValue extends defined>(
    previousMap: ReadonlyMap<TKey, TValue>,
    newMap: ReadonlyMap<TKey, TValue>,
): {
    entriesAdded: {
        key: TKey;
        value: TValue;
    }[];
    entriesChanged: {
        key: TKey;
        value: TValue;
        previousValue: TValue;
    }[];
    keysRemoved: TKey[];
};
