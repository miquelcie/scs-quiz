// localStorage en memoria para aislar cada test.
export const createMemoryStorage = () => {
    const data = new Map();

    return {
        getItem: key => (data.has(key) ? data.get(key) : null),
        setItem: (key, value) => { data.set(key, String(value)); },
        removeItem: key => { data.delete(key); },
        clear: () => { data.clear(); },
        key: index => [...data.keys()][index] ?? null,
        get length() { return data.size; }
    };
};
