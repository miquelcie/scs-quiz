// Banco mínimo y determinista para los tests.
export const makeBank = () => structuredClone([
    {
        id: 'T-001',
        statement: 'Pregunta 1',
        options: [
            { id: 'A', text: 'Opción 1A' },
            { id: 'B', text: 'Opción 1B' },
            { id: 'C', text: 'Opción 1C' },
            { id: 'D', text: 'Opción 1D' }
        ],
        correctOption: 'A',
        explanation: '',
        document: 'Fixture',
        page: 1
    },
    {
        id: 'T-002',
        statement: 'Pregunta 2',
        options: [
            { id: 'A', text: 'Opción 2A' },
            { id: 'B', text: 'Opción 2B' },
            { id: 'C', text: 'Opción 2C' },
            { id: 'D', text: 'Opción 2D' }
        ],
        correctOption: 'B',
        explanation: 'Explicación 2',
        document: 'Fixture',
        page: 2
    },
    {
        id: 'T-003',
        statement: 'Pregunta 3',
        options: [
            { id: 'A', text: 'Opción 3A' },
            { id: 'B', text: 'Opción 3B' },
            { id: 'C', text: 'Opción 3C' },
            { id: 'D', text: 'Opción 3D' }
        ],
        correctOption: 'C',
        explanation: '',
        document: 'Fixture',
        page: 3
    },
    {
        id: 'T-004',
        statement: 'Pregunta 4',
        options: [
            { id: 'A', text: 'Opción 4A' },
            { id: 'B', text: 'Opción 4B' },
            { id: 'C', text: 'Opción 4C' },
            { id: 'D', text: 'Opción 4D' }
        ],
        correctOption: 'D',
        explanation: '',
        document: 'Fixture',
        page: 4
    }
]);
