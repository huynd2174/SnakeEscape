import { Vec3 } from 'cc';
import { GridPos, VisualPoint, VisualSegment } from './SnakeTypes';

export function cloneCells(cells: GridPos[]): GridPos[] {
    return cells.map(cell => ({
        x: cell.x,
        y: cell.y,
    }));
}

export function isOutsideBoard(pos: GridPos, cols: number, rows: number): boolean {
    return (
        pos.x < 0 ||
        pos.x >= cols ||
        pos.y < 0 ||
        pos.y >= rows
    );
}

export function areCellsFullyOutsideBoard(cells: GridPos[], cols: number, rows: number): boolean {
    return cells.every(cell => isOutsideBoard(cell, cols, rows));
}

export function pullCellsForward(cells: GridPos[], nextHead: GridPos): GridPos[] {
    const nextCells = cloneCells(cells);

    for (let i = nextCells.length - 1; i >= 1; i--) {
        nextCells[i] = { ...nextCells[i - 1] };
    }

    nextCells[0] = nextHead;
    return nextCells;
}

export function getOppositeDirection(dir: GridPos): GridPos {
    return {
        x: -dir.x,
        y: -dir.y,
    };
}

export function gridToLocalFloat(
    x: number,
    y: number,
    cols: number,
    rows: number,
    cellSize: number,
): Vec3 {
    const startX = -cols * cellSize / 2 + cellSize / 2;
    const startY = rows * cellSize / 2 - cellSize / 2;

    return new Vec3(
        startX + x * cellSize,
        startY - y * cellSize,
        0
    );
}

export function buildSnakeVisualPoints(
    cells: GridPos[],
    direction: GridPos,
    cols: number,
    rows: number,
    cellSize: number,
    piecesPerGridStep: number,
): VisualPoint[] {
    const points: VisualPoint[] = [];

    if (cells.length <= 0) {
        return points;
    }

    const head = cells[0];

    points.push({
        position: gridToLocalFloat(head.x, head.y, cols, rows, cellSize),
        dir: direction,
    });

    for (let i = 1; i < cells.length; i++) {
        const front = cells[i - 1];
        const back = cells[i];

        const dirToFront = {
            x: front.x - back.x,
            y: front.y - back.y,
        };

        for (let k = 1; k <= piecesPerGridStep; k++) {
            const t = k / piecesPerGridStep;
            const x = front.x + (back.x - front.x) * t;
            const y = front.y + (back.y - front.y) * t;

            points.push({
                position: gridToLocalFloat(x, y, cols, rows, cellSize),
                dir: dirToFront,
            });
        }
    }

    return points;
}

export function buildSnakeVisualSegments(
    cells: GridPos[],
    cols: number,
    rows: number,
    cellSize: number,
): VisualSegment[] {
    const segments: VisualSegment[] = [];

    for (let i = 1; i < cells.length; i++) {
        const front = cells[i - 1];
        const back = cells[i];

        segments.push({
            start: gridToLocalFloat(front.x, front.y, cols, rows, cellSize),
            end: gridToLocalFloat(back.x, back.y, cols, rows, cellSize),
        });
    }

    return segments;
}

export function distanceToSegment(point: Vec3, start: Vec3, end: Vec3): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared <= 0) {
        return Math.hypot(point.x - start.x, point.y - start.y);
    }

    const t = Math.max(0, Math.min(1, (
        (point.x - start.x) * dx +
        (point.y - start.y) * dy
    ) / lengthSquared));

    const closestX = start.x + dx * t;
    const closestY = start.y + dy * t;

    return Math.hypot(point.x - closestX, point.y - closestY);
}
