import { Node, Vec3 } from 'cc';

export type GridPos = {
    x: number;
    y: number;
};

export type VisualPoint = {
    position: Vec3;
    dir: GridPos;
};

export type VisualSegment = {
    start: Vec3;
    end: Vec3;
};

export type Bounds = {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
};

export type SnakeSkin = 'blue' | 'green' | 'pink' | 'red' | 'violet' | 'yellow';

export type SnakeData = {
    id: number;
    skin: SnakeSkin;
    direction: GridPos;
    cells: GridPos[];
    nodes: Node[];
    escaped: boolean;
    moving: boolean;
    canBePassedThrough: boolean;
};
