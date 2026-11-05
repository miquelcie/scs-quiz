// localStorage en memoria con fallos inyectables para probar la robustez.
// Cada operación solo lanza si su bandera está activa.
export const createFailingStorage = ({
    failOnGet = false,
    failOnSet = false,
    failOnRemove = false
} = {}) => {
    const data = new Map();

    return {
        getItem: key => {
            if (failOnGet) throw new Error('getItem bloqueado');
            return data.has(key) ? data.get(key) : null;
        },
        setItem: (key, value) => {
            if (failOnSet) throw new Error('setItem bloqueado');
            data.set(key, String(value));
        },
        removeItem: key => {
            if (failOnRemove) throw new Error('removeItem bloqueado');
            data.delete(key);
        },
        clear: () => { data.clear(); },
        key: index => [...data.keys()][index] ?? null,
        get length() { return data.size; }
    };
};
