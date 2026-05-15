import { GridPos, SnakeSkin } from './SnakeTypes';

export type SnakeLevelData = {
    id: number;
    skin: SnakeSkin;
    direction: GridPos;
    cells: GridPos[];
};

export const LEVEL_5_SNAKES: SnakeLevelData[] = [
    {
        id: 1,
        skin: 'pink',
        direction: { x: -1, y: 0 },
        cells: [
            { x: 0, y: 2 },
            { x: 1, y: 2 },
            { x: 2, y: 2 },
            { x: 2, y: 1 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 2, y: 0 },
        ],
    },

    {
        id: 2,
        skin: 'yellow',
        direction: { x: 0, y: 1 },
        cells: [
            { x: 4, y: 4 },
            { x: 4, y: 3 },
            { x: 3, y: 3 },
            { x: 3, y: 2 },
            { x: 3, y: 1 },
            { x: 3, y: 0 },
        ],
    },

    {
        id: 3,
        skin: 'green',
        direction: { x: 0, y: 1 },
        cells: [
            { x: 4, y: 2 },
            { x: 4, y: 1 },
            { x: 4, y: 0 },
            { x: 5, y: 0 },
            { x: 5, y: 1 },
            { x: 5, y: 2 },
            { x: 5, y: 3 },
            { x: 5, y: 4 },
        ],
    },

    {
        id: 4,
        skin: 'blue',
        direction: { x: 0, y: 1 },
        cells: [
            { x: 8, y: 3 },
            { x: 8, y: 2 },
            { x: 8, y: 1 },
            { x: 8, y: 0 },
            { x: 7, y: 0 },
            { x: 7, y: 1 },
            { x: 7, y: 2 },
            { x: 7, y: 3 },
        ],
    },

    {
        id: 5,
        skin: 'red',
        direction: { x: 1, y: 0 },
        cells: [
            { x: 3, y: 4 },
            { x: 2, y: 4 },
            { x: 1, y: 4 },
            { x: 0, y: 4 },
            { x: 0, y: 3 },
            { x: 1, y: 3 },
            { x: 2, y: 3 },
        ],
    },

    {
        id: 6,
        skin: 'blue',
        direction: { x: 0, y: -1 },
        cells: [
            { x: 2, y: 5 },
            { x: 2, y: 6 },
            { x: 1, y: 6 },
            { x: 1, y: 5 },
            { x: 0, y: 5 },
            { x: 0, y: 6 },
        ],
    },

    {
        id: 7,
        skin: 'pink',
        direction: { x: 0, y: 1 },
        cells: [
            { x: 3, y: 8 },
            { x: 3, y: 7 },
            { x: 3, y: 6 },
            { x: 4, y: 6 },
            { x: 5, y: 6 },
            { x: 5, y: 5 },
            { x: 4, y: 5 },
            { x: 3, y: 5 },
        ],
    },

    {
        id: 8,
        skin: 'red',
        direction: { x: -1, y: 0 },
        cells: [
            { x: 4, y: 7 },
            { x: 5, y: 7 },
            { x: 6, y: 7 },
            { x: 6, y: 6 },
            { x: 7, y: 6 },
            { x: 8, y: 6 },
            { x: 9, y: 6 },
            { x: 9, y: 5 },
            { x: 8, y: 5 },
            { x: 7, y: 5 },
            { x: 6, y: 5 },

        ],
    },

    {
        id: 9,
        skin: 'yellow',
        direction: { x: 0, y: -1 },
        cells: [
            { x: 9, y: 7 },
            { x: 9, y: 8 },
            { x: 8, y: 8 },
            { x: 8, y: 7 },
            { x: 7, y: 7 },
            { x: 7, y: 8 },
            { x: 6, y: 8 },
            { x: 5, y: 8 },
            { x: 4, y: 8 },
        ],
    },

    {
        id: 10,
        skin: 'violet',
        direction: { x: 1, y: 0 },
        cells: [
            { x: 9, y: 9 },
            { x: 8, y: 9 },
            { x: 7, y: 9 },
            { x: 6, y: 9 },
            { x: 5, y: 9 },
            { x: 4, y: 9 },
            { x: 3, y: 9 },
            { x: 2, y: 9 },
            { x: 1, y: 9 },
            { x: 0, y: 9 },
            { x: 0, y: 8 },
            { x: 1, y: 8 },
            { x: 2, y: 8 },
            { x: 2, y: 7 },
            { x: 1, y: 7 },
            { x: 0, y: 7 },
        ],
    },

    {
        id: 11,
        skin: 'red',
        direction: { x: -1, y: 0 },
        cells: [
            { x: 0, y: 11 },
            { x: 1, y: 11 },
            { x: 2, y: 11 },
            { x: 3, y: 11 },
            { x: 3, y: 10 },
            { x: 2, y: 10 },
            { x: 1, y: 10 },
            { x: 0, y: 10 },
        ],
    },

    {
        id: 12,
        skin: 'violet',
        direction: { x: 0, y: -1 },
        cells: [
            { x: 9, y: 0 },
            { x: 9, y: 1 },
            { x: 9, y: 2 },
            { x: 9, y: 3 },
            { x: 9, y: 4 },
            { x: 8, y: 4 },
            { x: 7, y: 4 },
            { x: 6, y: 4 },
            { x: 6, y: 3 },
            { x: 6, y: 2 },
            { x: 6, y: 1 },
            { x: 6, y: 0 },
        ],
    },

    {
        id: 13,
        skin: 'green',
        direction: { x: 0, y: 1 },
        cells: [
            { x: 4, y: 11 },
            { x: 4, y: 10 },
            { x: 5, y: 10 },
            { x: 5, y: 11 },
            { x: 6, y: 11 },
            { x: 6, y: 10 },
            { x: 7, y: 10 },
            { x: 7, y: 11 },
            { x: 8, y: 11 },
            { x: 8, y: 10 },
            { x: 9, y: 10 },

        ],
    },

    {
        id: 14,
        skin: 'yellow',
        direction: { x: 1, y: 0 },
        cells: [
            { x: 1, y: 13 },
            { x: 0, y: 13 },
            { x: 0, y: 12 },
            { x: 1, y: 12 },
            { x: 2, y: 12 },
            { x: 3, y: 12 },
            { x: 4, y: 12 },
            { x: 5, y: 12 },
            { x: 6, y: 12 },
            { x: 7, y: 12 },
            { x: 8, y: 12 },
            { x: 9, y: 12 },
            { x: 9, y: 11 },
        ],
    },

    {
        id: 15,
        skin: 'pink',
        direction: { x: 1, y: 0 },
        cells: [
            { x: 9, y: 13 },
            { x: 8, y: 13 },
            { x: 7, y: 13 },
            { x: 6, y: 13 },
            { x: 5, y: 13 },
            { x: 4, y: 13 },
            { x: 3, y: 13 },
            { x: 2, y: 13 },

        ],
    },
];
