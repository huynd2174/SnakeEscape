import {
    _decorator,
    Component,
    Node,
    Prefab,
    instantiate,
    Vec3,
    Color,
    Sprite,
    UITransform,
    input,
    Input,
    EventTouch,
    Label,
    tween,
} from 'cc';

import { SnakePiece } from './SnakePiece';

const { ccclass, property } = _decorator;

type GridPos = {
    x: number;
    y: number;
};

type SnakeData = {
    id: number;
    color: Color;
    direction: GridPos;
    cells: GridPos[];
    nodes: Node[];
    escaped: boolean;
    moving: boolean;
};

@ccclass('SnakeEscapeGame')
export class SnakeEscapeGame extends Component {
    @property(Node)
    gameArea: Node = null!;

    @property(Node)
    dotGrid: Node = null!;

    @property(Node)
    snakeRoot: Node = null!;

    @property(Prefab)
    dotPrefab: Prefab = null!;

    @property(Prefab)
    snakePiecePrefab: Prefab = null!;

    @property(Label)
    levelLabel: Label = null!;

    @property(Label)
    snakeCountLabel: Label = null!;

    @property(Label)
    timeLabel: Label = null!;

    @property(Node)
    winPanel: Node = null!;

    private readonly cols = 8;
    private readonly rows = 10;
    private readonly cellSize = 64;

    private snakes: SnakeData[] = [];
    private escapedCount = 0;
    private totalSnakeCount = 0;

    private isPlaying = true;

    private readonly levelTime: number = 120;
    private remainingTime: number = 120;

    onLoad() {
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    onDestroy() {
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    start() {
        this.resetLevel();
    }

    update(deltaTime: number) {
        if (!this.isPlaying) return;

        this.remainingTime -= deltaTime;

        if (this.remainingTime <= 0) {
            this.remainingTime = 0;
            this.updateTimeLabel();
            this.onTimeUp();
            return;
        }

        this.updateTimeLabel();
    }

    public resetLevel() {
        this.isPlaying = true;
        this.escapedCount = 0;

        if (this.winPanel) {
            this.winPanel.active = false;
        }

        if (this.levelLabel) {
            this.levelLabel.string = 'Level 1';
        }

        this.remainingTime = this.levelTime;
        this.updateTimeLabel();

        this.clearChildren(this.snakeRoot);
        this.clearChildren(this.dotGrid);

        this.createDotGrid();
        this.createLevelData();
        this.spawnSnakes();
        this.updateSnakeCountLabel();
    }

    private createDotGrid() {
        if (!this.dotPrefab || !this.dotGrid) return;

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const dot = instantiate(this.dotPrefab);
                dot.setParent(this.dotGrid);
                dot.setPosition(this.gridToLocal(x, y));
            }
        }
    }

    private createLevelData() {
        this.snakes = [
            {
                id: 1,
                color: new Color(255, 120, 40, 255),
                direction: { x: 1, y: 0 },
                cells: [
                    { x: 1, y: 2 },
                    { x: 0, y: 2 },
                ],
                nodes: [],
                escaped: false,
                moving: false,
            },
            {
                id: 2,
                color: new Color(65, 130, 255, 255),
                direction: { x: 0, y: 1 },
                cells: [
                    { x: 3, y: 1 },
                    { x: 3, y: 0 },
                ],
                nodes: [],
                escaped: false,
                moving: false,
            },
            {
                id: 3,
                color: new Color(145, 75, 230, 255),
                direction: { x: -1, y: 0 },
                cells: [
                    { x: 6, y: 5 },
                    { x: 7, y: 5 },
                ],
                nodes: [],
                escaped: false,
                moving: false,
            },
        ];

        this.totalSnakeCount = this.snakes.length;
    }

    private spawnSnakes() {
        if (!this.snakePiecePrefab || !this.snakeRoot) return;

        for (const snake of this.snakes) {
            snake.nodes = [];

            for (let i = 0; i < snake.cells.length; i++) {
                const cell = snake.cells[i];

                const node = instantiate(this.snakePiecePrefab);
                node.setParent(this.snakeRoot);
                node.setPosition(this.gridToLocal(cell.x, cell.y));

                const sprite = node.getComponent(Sprite);
                if (sprite) {
                    sprite.color = snake.color;
                }

                const piece = node.getComponent(SnakePiece);
                if (piece) {
                    piece.snakeId = snake.id;
                    piece.pieceIndex = i;
                }

                if (i === 0) {
                    node.setScale(1.08, 1.08, 1);
                    this.rotateHeadByDirection(node, snake.direction);
                }

                snake.nodes.push(node);
            }
        }
    }

    private onTouchEnd(event: EventTouch) {
        if (!this.isPlaying) return;

        const uiLocation = event.getUILocation();
        const touchedSnake = this.findTouchedSnake(uiLocation.x, uiLocation.y);

        if (!touchedSnake) return;

        this.tryMoveSnake(touchedSnake);
    }

    private findTouchedSnake(screenX: number, screenY: number): SnakeData | null {
        for (const snake of this.snakes) {
            if (snake.escaped) continue;

            for (const node of snake.nodes) {
                if (!node || !node.isValid) continue;

                const ui = node.getComponent(UITransform);
                if (!ui) continue;

                const box = ui.getBoundingBoxToWorld();

                if (
                    screenX >= box.x &&
                    screenX <= box.x + box.width &&
                    screenY >= box.y &&
                    screenY <= box.y + box.height
                ) {
                    return snake;
                }
            }
        }

        return null;
    }

    private tryMoveSnake(snake: SnakeData) {
        if (snake.moving || snake.escaped) return;

        const next = {
            x: snake.cells[0].x + snake.direction.x,
            y: snake.cells[0].y + snake.direction.y,
        };

        if (this.isBlockedByOtherSnake(next, snake.id)) {
            this.playBlockedEffect(snake);
            return;
        }

        snake.moving = true;
        this.moveSnakeUntilStopOrEscape(snake);
    }

    private moveSnakeUntilStopOrEscape(snake: SnakeData) {
        const next = {
            x: snake.cells[0].x + snake.direction.x,
            y: snake.cells[0].y + snake.direction.y,
        };

        if (this.isOutsideBoard(next)) {
            this.escapeSnake(snake);
            return;
        }

        if (this.isBlockedByOtherSnake(next, snake.id)) {
            snake.moving = false;
            return;
        }

        const oldCells = snake.cells.map(c => ({ x: c.x, y: c.y }));

        for (let i = snake.cells.length - 1; i >= 1; i--) {
            snake.cells[i] = { ...snake.cells[i - 1] };
        }

        snake.cells[0] = next;

        const moveTime = 0.08;
        let finishedCount = 0;

        for (let i = 0; i < snake.nodes.length; i++) {
            const target = this.gridToLocal(snake.cells[i].x, snake.cells[i].y);

            tween(snake.nodes[i])
                .to(moveTime, { position: target })
                .call(() => {
                    finishedCount++;

                    if (finishedCount >= snake.nodes.length) {
                        this.moveSnakeUntilStopOrEscape(snake);
                    }
                })
                .start();
        }
    }

    private escapeSnake(snake: SnakeData) {
        const moveTime = 0.15;

        const escapeOffset = new Vec3(
            snake.direction.x * this.cellSize * 1.4,
            -snake.direction.y * this.cellSize * 1.4,
            0
        );

        let finished = 0;

        for (const node of snake.nodes) {
            const target = node.position.clone().add(escapeOffset);

            tween(node)
                .to(moveTime, { position: target, scale: new Vec3(0.7, 0.7, 1) })
                .call(() => {
                    if (node && node.isValid) {
                        node.destroy();
                    }

                    finished++;

                    if (finished >= snake.nodes.length) {
                        snake.escaped = true;
                        snake.moving = false;
                        this.escapedCount++;
                        this.updateSnakeCountLabel();
                        this.checkWin();
                    }
                })
                .start();
        }
    }

    private isBlockedByOtherSnake(pos: GridPos, currentSnakeId: number): boolean {
        if (this.isOutsideBoard(pos)) {
            return false;
        }

        for (const snake of this.snakes) {
            if (snake.escaped) continue;
            if (snake.id === currentSnakeId) continue;

            for (const cell of snake.cells) {
                if (cell.x === pos.x && cell.y === pos.y) {
                    return true;
                }
            }
        }

        return false;
    }

    private isOutsideBoard(pos: GridPos): boolean {
        return (
            pos.x < 0 ||
            pos.x >= this.cols ||
            pos.y < 0 ||
            pos.y >= this.rows
        );
    }

    private updateSnakeCountLabel() {
        if (this.snakeCountLabel) {
            this.snakeCountLabel.string = `${this.escapedCount}/${this.totalSnakeCount}`;
        }
    }

    private checkWin() {
        if (this.escapedCount < this.totalSnakeCount) return;

        this.isPlaying = false;

        if (this.winPanel) {
            this.winPanel.active = true;
        }
    }

    private updateTimeLabel() {
        if (!this.timeLabel) return;

        const totalSeconds = Math.ceil(this.remainingTime);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        const minuteText = minutes.toString().padStart(2, '0');
        const secondText = seconds.toString().padStart(2, '0');

        this.timeLabel.string = `${minuteText}:${secondText}`;
    }

    private onTimeUp() {
        this.isPlaying = false;

        if (this.winPanel) {
            this.winPanel.active = true;
        }
    }

    private playBlockedEffect(snake: SnakeData) {
        for (const node of snake.nodes) {
            const original = node.position.clone();

            tween(node)
                .by(0.04, { position: new Vec3(4, 0, 0) })
                .by(0.04, { position: new Vec3(-8, 0, 0) })
                .by(0.04, { position: new Vec3(4, 0, 0) })
                .call(() => {
                    node.setPosition(original);
                })
                .start();
        }
    }

    private rotateHeadByDirection(headNode: Node, dir: GridPos) {
        if (dir.x === 1) {
            headNode.angle = -90;
        } else if (dir.x === -1) {
            headNode.angle = 90;
        } else if (dir.y === 1) {
            headNode.angle = 180;
        } else if (dir.y === -1) {
            headNode.angle = 0;
        }
    }

    private gridToLocal(x: number, y: number): Vec3 {
        const startX = -this.cols * this.cellSize / 2 + this.cellSize / 2;
        const startY = this.rows * this.cellSize / 2 - this.cellSize / 2;

        return new Vec3(
            startX + x * this.cellSize,
            startY - y * this.cellSize,
            0
        );
    }

    private clearChildren(parent: Node) {
        if (!parent) return;

        for (const child of [...parent.children]) {
            child.destroy();
        }
    }
}