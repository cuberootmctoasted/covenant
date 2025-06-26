import { Discriminator } from "./hooks";

export function turnArrayWithIdentifierToMap<T extends defined>(
    array: ReadonlyArray<T>,
    getIdentifier: (state: T) => Discriminator,
) {
    const newMap: Map<Discriminator, T> = new Map();
    array.forEach((value) => {
        const identifier = getIdentifier(value);
        newMap.set(identifier as defined, value);
    });
    return newMap;
}

export function compareMaps<TKey extends Discriminator, TValue extends defined>(
    previousMap: ReadonlyMap<TKey, TValue>,
    newMap: ReadonlyMap<TKey, TValue>,
) {
    const entriesAdded: { key: TKey; value: TValue }[] = [];
    const entriesChanged: {
        key: TKey;
        value: TValue;
        previousValue: TValue;
    }[] = [];
    const keysRemoved: TKey[] = [];
    newMap.forEach((value, key) => {
        if (!previousMap.has(key)) {
            entriesAdded.push({ key, value });
        } else {
            const previousValue = previousMap.get(key)!;
            if (previousValue !== value) {
                entriesChanged.push({ key, value, previousValue });
            }
        }
    });
    previousMap.forEach((_, key) => {
        if (!newMap.has(key)) {
            keysRemoved.push(key);
        }
    });
    return {
        entriesAdded,
        entriesChanged,
        keysRemoved,
    };
}
