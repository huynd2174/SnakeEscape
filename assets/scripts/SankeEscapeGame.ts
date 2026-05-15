import {
    _decorator,
    Component,
    Node,
    Prefab,
    instantiate,
    Vec3,
    Color,
    Sprite,
    SpriteFrame,
    UIOpacity,
    UITransform,
    input,
    Input,
    EventTouch,
    Label,
    Mask,
    Tween,
    tween,
    Graphics,
} from 'cc';

import { SnakePiece } from './SnakePiece';
import { LEVEL_5_SNAKES } from './SnakeLevels';
import {
    flashSnakeColor as playFlashSnakeColor,
    playHeartLostEffect as playHeartLostAnimation,
    playNodePop,
    playRedAuraOverlay as playRedAuraAnimation,
    playSnakeBlockedShake,
    playSnakeHitLiftEffect,
    playSnakeTapEffect as playSnakeTapAnimation,
    prepareRedAuraOverlay as prepareRedAuraAnimation,
} from './SnakeEffects';
import {
    SNAKE_BOARD_COLS,
    SNAKE_BOARD_ROWS,
    SNAKE_CELL_SIZE,
    SNAKE_GRID_STEP_MOVE_TIME,
    SNAKE_RETURN_SPEED_FACTOR,
    SNAKE_LEVEL_TIME,
    SNAKE_MAX_LIVES,
    SNAKE_PIECE_HEIGHT,
    SNAKE_PIECES_PER_GRID_STEP,
    SNAKE_TOUCH_PADDING,
    SNAKE_GAME_AREA_MAX_X,
    SNAKE_GAME_AREA_MAX_Y,
    SNAKE_GAME_AREA_MIN_X,
    SNAKE_GAME_AREA_MIN_Y,
    SNAKE_GAME_AREA_PAN_THRESHOLD,
} from './SnakeConfig';
import {
    areCellsFullyOutsideBoard,
    buildSnakeVisualPoints as buildVisualPoints,
    buildSnakeVisualSegments as buildVisualSegments,
    cloneCells,
    distanceToSegment as getDistanceToSegment,
    getOppositeDirection as getReverseDirection,
    gridToLocalFloat,
    isOutsideBoard,
    pullCellsForward as getPulledCellsForward,
} from './SnakeGridUtils';
import {
    getHeadEyeLayout,
    getOriginalAspectSize,
    getSnakePieceFrameByVisualIndex as getVisualFrame,
    getSnakePieceScaleByVisualIndex,
} from './SnakeVisualUtils';
import {
    Bounds,
    GridPos,
    SnakeData,
    VisualPoint,
} from './SnakeTypes';
import { BoardZoomController } from './BoardZoomController';
import { SoundManager } from './SoundManager';
import { SnakeFaceController } from './SnakeFaceController';
import { LevelCompleteEffect } from './LevelCompleteEffect';

const { ccclass, property } = _decorator;

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

    @property(Prefab)
    snakeFacePrefab: Prefab | null = null;

    @property(SpriteFrame)
    snakeHeadFrame: SpriteFrame = null!;

    @property(SpriteFrame)
    snakeHeadEyeFrame: SpriteFrame = null!;

    @property(SpriteFrame)
    snakeBodyFrame: SpriteFrame = null!;

    @property(SpriteFrame)
    snakeTailNearFrame: SpriteFrame = null!;

    @property(SpriteFrame)
    snakeTailEndFrame: SpriteFrame = null!;

    @property([SpriteFrame])
    snakeHeadFrames: SpriteFrame[] = [];

    @property([SpriteFrame])
    snakeBodyFrames: SpriteFrame[] = [];

    @property([SpriteFrame])
    snakeTailNearFrames: SpriteFrame[] = [];

    @property([SpriteFrame])
    snakeTailEndFrames: SpriteFrame[] = [];

    @property(Label)
    levelLabel: Label = null!;

    @property(Label)
    snakeCountLabel: Label = null!;

    @property(Label)
    timeLabel: Label = null!;

    @property(Node)
    winPanel: Node = null!;

    @property(Prefab)
    levelCompleteEffectPrefab: Prefab | null = null;

    @property([SpriteFrame])
    endgameEffectFrames: SpriteFrame[] = [];

    @property(SoundManager)
    soundManager: SoundManager | null = null;

    @property([Node])
    heartIcons: Node[] = [];

    @property(SpriteFrame)
    heartFullFrame: SpriteFrame = null!;

    @property(SpriteFrame)
    heartEmptyFrame: SpriteFrame = null!;

    @property(Node)
    redAuraNode: Node = null!;

    @property(Label)
    winTitleLabel: Label = null!;

    @property(Label)
    finalTextLabel: Label = null!;

    @property(SpriteFrame)
    timeoutLoseFrame: SpriteFrame = null!;

    private readonly cols = SNAKE_BOARD_COLS;
    private readonly rows = SNAKE_BOARD_ROWS;
    private readonly cellSize = SNAKE_CELL_SIZE;
    private readonly piecesPerGridStep = SNAKE_PIECES_PER_GRID_STEP;
    private readonly gridStepMoveTime = SNAKE_GRID_STEP_MOVE_TIME;
    private readonly snakePieceHeight = SNAKE_PIECE_HEIGHT;
    private readonly touchPadding = SNAKE_TOUCH_PADDING;
    private readonly gameAreaPanMinX = SNAKE_GAME_AREA_MIN_X;
    private readonly gameAreaPanMaxX = SNAKE_GAME_AREA_MAX_X;
    private readonly gameAreaPanMinY = SNAKE_GAME_AREA_MIN_Y;
    private readonly gameAreaPanMaxY = SNAKE_GAME_AREA_MAX_Y;
    private readonly gameAreaPanThreshold = SNAKE_GAME_AREA_PAN_THRESHOLD;

    private snakes: SnakeData[] = [];
    private escapedCount = 0;
    private totalSnakeCount = 0;

    private isPlaying = true;
    private readonly maxLives: number = SNAKE_MAX_LIVES;
    private currentLives: number = SNAKE_MAX_LIVES;
    private renderedLives: number = -1;
    private penalizedSnakeIds: Set<number> = new Set();

    private readonly levelTime: number = SNAKE_LEVEL_TIME;
    private remainingTime: number = SNAKE_LEVEL_TIME;
    private hasTimerStarted: boolean = false;
    private lastRenderedSecond: number = -1;
    private hasPlayedTimeoutSound: boolean = false;
    private readonly tickTockStartSeconds: number = 10;
    private isReplayEffectPlaying = false;
    private isWinDotRipplePlaying = false;
    private hasShownWinEffects = false;
    private pendingWinDotRippleOrigin: Vec3 | null = null;
    private lastSnakeTapVibrationTime: number = 0;
    private readonly snakeTapVibrationCooldownMs: number = 80;
    private loseBackdropNode: Node | null = null;
    private defaultLoseFrame: SpriteFrame | null = null;
    private replayButtonNode: Node | null = null;
    private retryButtonNode: Node | null = null;
    private playAgainButtonNode: Node | null = null;
    private isRetryEffectPlaying = false;
    private activeEndPanel: Node | null = null;
    private isGameAreaTouchActive = false;
    private isGameAreaDragging = false;
    private gameAreaTouchStart = new Vec3();
    private gameAreaStartPosition = new Vec3();
    private gameAreaInitialPosition = new Vec3();
    private zoomTrackNode: Node | null = null;
    private zoomHandleNode: Node | null = null;
    private zoomPercentLabel: Label | null = null;
    private levelCompleteEffect: LevelCompleteEffect | null = null;
    private levelCompleteEffectNode: Node | null = null;
    private endgameEffectRoot: Node | null = null;
    private readonly playLevelCompleteEffectCallback = () => this.playLevelCompleteEffect();
    private readonly playEndgameImageEffectsCallback = () => this.playEndgameImageEffects();
    private readonly levelCompleteEffectScale: number = 0.6;
    private readonly zoomMinScale: number = 0.75;
    private readonly zoomMaxScale: number = 1.65;
    private readonly zoomStep: number = 0.1;
    private readonly zoomBarHeight: number = 398;
    private readonly zoomHandleRange: number = 165;
    private readonly snakeFaceEyeCenterY: number = 110.5;
    private zoomScale: number = 1;

    onLoad() {
        if (!this.soundManager) {
            this.soundManager = this.getComponent(SoundManager);
        }

        this.ensureCanvasMask();
        this.prepareRedAuraOverlay();
        this.captureGameAreaInitialPosition();
        this.setupReplayButton();
        this.setupRetryButton();
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    onDestroy() {
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.onTouchCancel, this);

        if (this.replayButtonNode && this.replayButtonNode.isValid) {
            this.replayButtonNode.off(Node.EventType.TOUCH_START, this.onReplayButtonTouchStart, this);
            this.replayButtonNode.off(Node.EventType.TOUCH_END, this.onReplayButtonTouchEnd, this);
            this.replayButtonNode.off(Node.EventType.TOUCH_CANCEL, this.onReplayButtonTouchCancel, this);
        }

        if (this.retryButtonNode && this.retryButtonNode.isValid) {
            this.retryButtonNode.off(Node.EventType.TOUCH_START, this.onRetryButtonTouchStart, this);
            this.retryButtonNode.off(Node.EventType.TOUCH_END, this.onRetryButtonTouchEnd, this);
            this.retryButtonNode.off(Node.EventType.TOUCH_CANCEL, this.onRetryButtonTouchCancel, this);
        }

        if (this.playAgainButtonNode && this.playAgainButtonNode.isValid) {
            this.playAgainButtonNode.off(Node.EventType.TOUCH_START, this.onRetryButtonTouchStart, this);
            this.playAgainButtonNode.off(Node.EventType.TOUCH_END, this.onRetryButtonTouchEnd, this);
            this.playAgainButtonNode.off(Node.EventType.TOUCH_CANCEL, this.onRetryButtonTouchCancel, this);
        }
    }

    start() {
        this.resetLevel();
    }

    update(deltaTime: number) {
        if (!this.isPlaying || !this.hasTimerStarted) return;

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
        if (this.isReplayEffectPlaying || this.isRetryEffectPlaying) return;

        this.resetLevelInternal();
    }

    private resetLevelInternal() {
        this.isReplayEffectPlaying = false;
        this.isRetryEffectPlaying = false;
        this.isPlaying = true;
        this.escapedCount = 0;
        this.currentLives = this.maxLives;
        this.renderedLives = -1;
        this.penalizedSnakeIds.clear();
        this.isWinDotRipplePlaying = false;
        this.hasShownWinEffects = false;
        this.pendingWinDotRippleOrigin = null;
        this.hasTimerStarted = false;
        this.lastRenderedSecond = -1;
        this.hasPlayedTimeoutSound = false;
        this.updateHeartUI();

        this.hideEndPanel(this.getLosePanelNode());
        this.hideEndPanel(this.getWinPanelNode());
        this.unschedule(this.playLevelCompleteEffectCallback);
        this.unschedule(this.playEndgameImageEffectsCallback);
        this.hideLevelCompleteEffect();
        this.hideEndgameImageEffects();
        this.setWinLabelVisible(true);
        this.activeEndPanel = null;
        this.setBackgroundDimmed(false);

        if (this.levelLabel) {
            this.levelLabel.string = 'Level 5';
        }

        this.remainingTime = this.levelTime;
        this.updateTimeLabel();
        this.resetGameAreaView();

        this.clearChildren(this.snakeRoot);
        this.clearChildren(this.dotGrid);

        this.createDotGrid();
        this.createLevelData();
        this.spawnSnakes();
        this.updateSnakeCountLabel();
        this.playGameAreaIntroEffect();
    }

    public onReplayButtonClicked(event?: { target?: Node; currentTarget?: Node }) {
        if (this.isReplayEffectPlaying) return;

        const buttonNode = event?.currentTarget || event?.target || this.replayButtonNode;
        if (!buttonNode || !buttonNode.isValid) {
            this.resetLevel();
            return;
        }

        this.isReplayEffectPlaying = true;
        Tween.stopAllByTarget(buttonNode);
        buttonNode.setScale(1, 1, 1);
        buttonNode.angle = 0;

        tween(buttonNode)
            .to(0.08, {
                scale: new Vec3(0.7, 0.7, 1),
                angle: -22,
            })
            .to(0.12, {
                scale: new Vec3(1.28, 1.28, 1),
                angle: 18,
            })
            .to(0.10, {
                scale: new Vec3(1, 1, 1),
                angle: 0,
            })
            .call(() => {
                this.finishReplayReset();
            })
            .start();
    }

    private setupReplayButton() {
        this.replayButtonNode = this.findChildByNameDeep(this.node.scene, 'ReplayButton');

        if (!this.replayButtonNode) return;

        this.replayButtonNode.off(Node.EventType.TOUCH_START, this.onReplayButtonTouchStart, this);
        this.replayButtonNode.off(Node.EventType.TOUCH_END, this.onReplayButtonTouchEnd, this);
        this.replayButtonNode.off(Node.EventType.TOUCH_CANCEL, this.onReplayButtonTouchCancel, this);
        this.replayButtonNode.on(Node.EventType.TOUCH_START, this.onReplayButtonTouchStart, this);
        this.replayButtonNode.on(Node.EventType.TOUCH_END, this.onReplayButtonTouchEnd, this);
        this.replayButtonNode.on(Node.EventType.TOUCH_CANCEL, this.onReplayButtonTouchCancel, this);
    }

    private setupRetryButton() {
        this.retryButtonNode = this.findChildByNameDeep(this.node.scene, 'RetryButton');
        this.playAgainButtonNode = this.findChildByNameDeep(this.node.scene, 'PlayAgainButton');

        this.bindRestartButton(this.retryButtonNode);
        this.bindRestartButton(this.playAgainButtonNode);
    }

    private bindRestartButton(buttonNode: Node | null) {
        if (!buttonNode) return;

        buttonNode.off(Node.EventType.TOUCH_START, this.onRetryButtonTouchStart, this);
        buttonNode.off(Node.EventType.TOUCH_END, this.onRetryButtonTouchEnd, this);
        buttonNode.off(Node.EventType.TOUCH_CANCEL, this.onRetryButtonTouchCancel, this);
        buttonNode.on(Node.EventType.TOUCH_START, this.onRetryButtonTouchStart, this);
        buttonNode.on(Node.EventType.TOUCH_END, this.onRetryButtonTouchEnd, this);
        buttonNode.on(Node.EventType.TOUCH_CANCEL, this.onRetryButtonTouchCancel, this);
    }

    private onReplayButtonTouchStart(event: EventTouch) {
        this.stopTouchPropagation(event);

        const buttonNode = this.replayButtonNode;
        if (!buttonNode || !buttonNode.isValid || this.isReplayEffectPlaying) return;

        Tween.stopAllByTarget(buttonNode);
        buttonNode.angle = -10;
        buttonNode.setScale(0.72, 0.72, 1);
    }

    private onReplayButtonTouchEnd(event: EventTouch) {
        this.stopTouchPropagation(event);

        const buttonNode = this.replayButtonNode;
        if (!buttonNode || !buttonNode.isValid || this.isReplayEffectPlaying) return;

        this.isReplayEffectPlaying = true;
        Tween.stopAllByTarget(buttonNode);

        tween(buttonNode)
            .to(0.10, {
                scale: new Vec3(1.35, 1.35, 1),
                angle: 24,
            }, { easing: 'backOut' })
            .to(0.10, {
                scale: new Vec3(0.95, 0.95, 1),
                angle: -8,
            })
            .to(0.08, {
                scale: new Vec3(1, 1, 1),
                angle: 0,
            })
            .call(() => {
                this.finishReplayReset();
            })
            .start();
    }

    private finishReplayReset() {
        this.isReplayEffectPlaying = false;
        this.resetLevelInternal();
    }

    private onRetryButtonTouchStart(event: EventTouch) {
        this.stopTouchPropagation(event);

        const buttonNode = this.getEventNode(event) || this.retryButtonNode || this.playAgainButtonNode;
        if (!buttonNode || !buttonNode.isValid || this.isRetryEffectPlaying) return;

        this.isRetryEffectPlaying = true;
        this.soundManager?.playClick();
        Tween.stopAllByTarget(buttonNode);
        buttonNode.setScale(0.88, 0.88, 1);
    }

    private onRetryButtonTouchEnd(event: EventTouch) {
        this.stopTouchPropagation(event);

        const buttonNode = this.getEventNode(event) || this.retryButtonNode || this.playAgainButtonNode;
        if (!buttonNode || !buttonNode.isValid) {
            this.finishRetryReset();
            return;
        }

        Tween.stopAllByTarget(buttonNode);
        tween(buttonNode)
            .to(0.16, { scale: new Vec3(1.08, 1.08, 1) }, { easing: 'backOut' })
            .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: 'sineOut' })
            .call(() => {
                this.finishRetryReset();
            })
            .start();
    }

    private onRetryButtonTouchCancel(event: EventTouch) {
        this.stopTouchPropagation(event);

        const buttonNode = this.getEventNode(event) || this.retryButtonNode || this.playAgainButtonNode;
        this.isRetryEffectPlaying = false;
        if (!buttonNode || !buttonNode.isValid) return;

        Tween.stopAllByTarget(buttonNode);
        tween(buttonNode)
            .to(0.10, { scale: new Vec3(1, 1, 1) }, { easing: 'sineOut' })
            .start();
    }

    private finishRetryReset() {
        this.isRetryEffectPlaying = false;
        this.resetLevelInternal();
    }

    private getEventNode(event: EventTouch): Node | null {
        const typedEvent = event as unknown as { currentTarget?: Node; target?: Node };
        return typedEvent.currentTarget || typedEvent.target || null;
    }

    private onReplayButtonTouchCancel(event: EventTouch) {
        this.stopTouchPropagation(event);

        const buttonNode = this.replayButtonNode;
        if (!buttonNode || !buttonNode.isValid || this.isReplayEffectPlaying) return;

        Tween.stopAllByTarget(buttonNode);
        tween(buttonNode)
            .to(0.08, {
                scale: new Vec3(1, 1, 1),
                angle: 0,
            })
            .start();
    }

    private stopTouchPropagation(event: EventTouch) {
        event.propagationStopped = true;
    }

    private findChildByNameDeep(root: Node | null | undefined, name: string): Node | null {
        if (!root) return null;
        if (root.name === name) return root;

        for (const child of root.children) {
            const found = this.findChildByNameDeep(child, name);
            if (found) return found;
        }

        return null;
    }

    private captureGameAreaInitialPosition() {
        if (!this.gameArea || !this.gameArea.isValid) return;

        this.gameAreaInitialPosition.set(this.gameArea.position);
    }

    private resetGameAreaView() {
        if (!this.gameArea || !this.gameArea.isValid) return;

        this.zoomScale = 1;
        Tween.stopAllByTarget(this.gameArea);
        this.gameArea.setPosition(this.gameAreaInitialPosition);
        this.gameArea.setScale(this.zoomScale, this.zoomScale, 1);

        const zoomPanel = this.findChildByNameDeep(this.node.scene, 'ZoomPanel');
        const zoomController = zoomPanel?.getComponent(BoardZoomController) || null;
        zoomController?.resetZoom();

        const handleNode = this.zoomHandleNode || this.findChildByNameDeep(this.node.scene, 'ZoomHandle');
        if (handleNode) {
            handleNode.setPosition(0, -this.zoomHandleRange, 0);
        }

        const label = this.zoomPercentLabel || this.findChildByNameDeep(this.node.scene, 'ZoomPercentLabel')?.getComponent(Label) || null;
        if (label) {
            label.node.active = true;
            label.string = '0%';
        }
    }

    private setupZoomBar() {
        this.zoomTrackNode = this.findChildByNameDeep(this.node.scene, 'ZoomTrack');
        this.zoomHandleNode = this.findChildByNameDeep(this.node.scene, 'ZoomHandle');
        const labelNode = this.findChildByNameDeep(this.node.scene, 'ZoomPercentLabel');
        if (labelNode) {
            labelNode.active = true;
        }
        this.zoomPercentLabel = labelNode?.getComponent(Label) || null;

        this.bindZoomTouchNode(this.zoomTrackNode);
        this.bindZoomTouchNode(this.zoomHandleNode);

        const zoomInNode = this.findChildByNameDeep(this.node.scene, 'ZoomInButton');
        const zoomOutNode = this.findChildByNameDeep(this.node.scene, 'ZoomOutButton');
        this.bindZoomStepNode(zoomInNode, this.zoomStep);
        this.bindZoomStepNode(zoomOutNode, -this.zoomStep);

        this.applyZoomScale(this.zoomScale);
    }

    private bindZoomTouchNode(node: Node | null) {
        if (!node) return;

        node.off(Node.EventType.TOUCH_START, this.onZoomBarTouch, this);
        node.off(Node.EventType.TOUCH_MOVE, this.onZoomBarTouch, this);
        node.off(Node.EventType.TOUCH_END, this.onZoomBarTouch, this);
        node.off(Node.EventType.TOUCH_CANCEL, this.onZoomBarTouch, this);
        node.on(Node.EventType.TOUCH_START, this.onZoomBarTouch, this);
        node.on(Node.EventType.TOUCH_MOVE, this.onZoomBarTouch, this);
        node.on(Node.EventType.TOUCH_END, this.onZoomBarTouch, this);
        node.on(Node.EventType.TOUCH_CANCEL, this.onZoomBarTouch, this);
    }

    private bindZoomStepNode(node: Node | null, delta: number) {
        if (!node) return;

        node.off(Node.EventType.TOUCH_END);
        node.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            this.stopTouchPropagation(event);
            this.isGameAreaTouchActive = false;
            this.isGameAreaDragging = false;
            this.applyZoomScale(this.zoomScale + delta);
        }, this);
    }

    private onZoomBarTouch(event: EventTouch) {
        this.stopTouchPropagation(event);
        this.isGameAreaTouchActive = false;
        this.isGameAreaDragging = false;

        if (!this.zoomTrackNode) return;

        const trackUi = this.zoomTrackNode.getComponent(UITransform);
        if (!trackUi) return;

        const uiLocation = event.getUILocation();
        const localPoint = trackUi.convertToNodeSpaceAR(new Vec3(uiLocation.x, uiLocation.y, 0));
        const halfHeight = this.zoomBarHeight / 2;
        const normalized = this.clamp((localPoint.y + halfHeight) / this.zoomBarHeight, 0, 1);
        const scale = this.zoomMinScale + normalized * (this.zoomMaxScale - this.zoomMinScale);

        this.applyZoomScale(scale);
    }

    private applyZoomScale(scale: number) {
        this.zoomScale = this.clamp(scale, this.zoomMinScale, this.zoomMaxScale);

        if (this.gameArea) {
            Tween.stopAllByTarget(this.gameArea);
            this.gameArea.setScale(this.zoomScale, this.zoomScale, 1);
            this.gameArea.setPosition(
                this.clamp(this.gameArea.position.x, this.gameAreaPanMinX, this.gameAreaPanMaxX),
                this.clamp(this.gameArea.position.y, this.gameAreaPanMinY, this.gameAreaPanMaxY),
                this.gameArea.position.z,
            );
        }

        const normalized = (this.zoomScale - this.zoomMinScale) / (this.zoomMaxScale - this.zoomMinScale);

        if (this.zoomHandleNode) {
            this.zoomHandleNode.setPosition(0, -this.zoomHandleRange + normalized * this.zoomHandleRange * 2, 0);
        }

        if (this.zoomPercentLabel) {
            this.zoomPercentLabel.node.active = true;
            this.zoomPercentLabel.string = `${Math.round(normalized * 100)}%`;
        }
    }

    private createDotGrid() {
        if (!this.dotPrefab || !this.dotGrid) return;

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const dot = instantiate(this.dotPrefab);
                dot.setParent(this.dotGrid);
                dot.setPosition(this.gridToLocal(x, y));
                dot.setScale(1, 1, 1);

                const opacity = dot.getComponent(UIOpacity) || dot.addComponent(UIOpacity);
                opacity.opacity = 255;
            }
        }
    }

    private createLevelData() {
        this.snakes = LEVEL_5_SNAKES.map(data => ({
            id: data.id,
            skin: data.skin,
            direction: { ...data.direction },
            cells: data.cells.map(cell => ({ ...cell })),
            nodes: [],
            escaped: false,
            moving: false,
            canBePassedThrough: false,
        }));

        this.totalSnakeCount = this.snakes.length;
    }

    private spawnSnakes() {
        if (!this.snakePiecePrefab || !this.snakeRoot) return;

        for (const snake of this.snakes) {
            const visualPoints = this.buildSnakeVisualPoints(snake);
            snake.nodes = new Array(visualPoints.length);

            for (let i = visualPoints.length - 1; i >= 0; i--) {
                const visual = visualPoints[i];

                const node = instantiate(this.snakePiecePrefab);
                node.setParent(this.snakeRoot);
                node.setPosition(visual.position);

                const sprite = node.getComponent(Sprite);
                if (sprite) {
                    sprite.color = Color.WHITE;
                    sprite.spriteFrame = this.getSnakePieceFrameByVisualIndex(i, visualPoints.length, snake);
                    this.fitSpriteToOriginalAspect(node, sprite);
                }

                const piece = node.getComponent(SnakePiece);
                if (piece) {
                    piece.snakeId = snake.id;
                    piece.pieceIndex = i;
                }

                this.rotateSnakePiece(node, visual, i, visualPoints.length);
                this.setSnakePieceBaseScale(node, i, visualPoints.length);
                this.updateHeadEye(node, i);

                if (i === 0) {
                    this.attachFaceToSnakeHead(node);
                }

                snake.nodes[i] = node;
            }

            this.applySnakePieceLayerOrder(snake);
        }
    }

    private onTouchStart(event: EventTouch) {
        if (event.getAllTouches().length >= 2 || BoardZoomController.isGestureZooming) {
            this.isGameAreaTouchActive = false;
            this.isGameAreaDragging = false;
            return;
        }

        const uiLocation = event.getUILocation();

        this.isGameAreaTouchActive = this.isPointInsideGameArea(uiLocation.x, uiLocation.y);
        this.isGameAreaDragging = false;

        if (!this.isGameAreaTouchActive || !this.gameArea) return;

        this.gameAreaTouchStart.set(uiLocation.x, uiLocation.y, 0);
        this.gameAreaStartPosition.set(this.gameArea.position);

        if (this.isPlaying && !this.hasTimerStarted) {
            const touchedSnake = this.findTouchedSnake(uiLocation.x, uiLocation.y);
            if (touchedSnake) {
                this.startLevelTimer();
            }
        }
    }

    private onTouchMove(event: EventTouch) {
        if (event.getAllTouches().length >= 2 || BoardZoomController.isGestureZooming) {
            this.isGameAreaTouchActive = false;
            this.isGameAreaDragging = false;
            return;
        }

        if (!this.isGameAreaTouchActive || !this.gameArea) return;

        const uiLocation = event.getUILocation();
        const deltaX = uiLocation.x - this.gameAreaTouchStart.x;
        const deltaY = uiLocation.y - this.gameAreaTouchStart.y;
        const dragDistanceSq = deltaX * deltaX + deltaY * deltaY;

        if (!this.isGameAreaDragging && dragDistanceSq < this.gameAreaPanThreshold * this.gameAreaPanThreshold) {
            return;
        }

        this.isGameAreaDragging = true;
        event.propagationStopped = true;

        this.gameArea.setPosition(
            this.clamp(this.gameAreaStartPosition.x + deltaX, this.gameAreaPanMinX, this.gameAreaPanMaxX),
            this.clamp(this.gameAreaStartPosition.y + deltaY, this.gameAreaPanMinY, this.gameAreaPanMaxY),
            this.gameAreaStartPosition.z,
        );
    }

    private onTouchEnd(event: EventTouch) {
        if (BoardZoomController.isGestureZooming) {
            this.finishGameAreaTouch(event);
            return;
        }

        if (this.finishGameAreaTouch(event)) return;
        if (!this.isPlaying) return;

        if (this.isPointInsideGameArea(this.gameAreaTouchStart.x, this.gameAreaTouchStart.y)) {
            this.playTapRippleEffect(this.gameAreaTouchStart.x, this.gameAreaTouchStart.y);
        }

        const touchedSnake = this.findTouchedSnake(this.gameAreaTouchStart.x, this.gameAreaTouchStart.y);

        if (!touchedSnake) return;

        this.tryMoveSnake(touchedSnake);
    }

    private onTouchCancel(event: EventTouch) {
        if (BoardZoomController.isGestureZooming) {
            this.finishGameAreaTouch(event);
            return;
        }

        this.finishGameAreaTouch(event);
    }

    private finishGameAreaTouch(event: EventTouch): boolean {
        const wasDragging = this.isGameAreaTouchActive && this.isGameAreaDragging;

        if (wasDragging) {
            event.propagationStopped = true;
        }

        this.isGameAreaTouchActive = false;
        this.isGameAreaDragging = false;

        return wasDragging;
    }

    private findTouchedSnake(screenX: number, screenY: number): SnakeData | null {
        for (const snake of this.snakes) {
            if (snake.escaped || snake.moving) continue;

            if (this.isPointNearSnake(screenX, screenY, snake)) {
                return snake;
            }

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

        this.startLevelTimer();

        const startCells = cloneCells(snake.cells);
        const willCollide = this.willSnakeCollide(snake);
        const isLastSnake = this.escapedCount === this.totalSnakeCount - 1;
        const headPosition = snake.nodes[0]?.position.clone() || null;

        this.pendingWinDotRippleOrigin = isLastSnake ? headPosition : null;
        snake.canBePassedThrough = !willCollide;

        this.bringSnakeToFront(snake);
        this.playSnakeTapVibration();
        this.soundManager?.playSnakeTap();
        this.getSnakeFace(snake)?.playTongue();
        this.playSnakeTapEffect(snake);

        if (isLastSnake && !willCollide) {
            this.playWinDotRippleEffect(headPosition);
        }

        snake.moving = true;
        this.moveSnakeUntilStopOrEscape(snake, startCells);
    }

    private playTapRippleEffect(screenX: number, screenY: number) {
        const canvasNode = this.getCanvasNode();
        const canvasUi = canvasNode.getComponent(UITransform);
        if (!canvasUi) return;

        const localPoint = canvasUi.convertToNodeSpaceAR(new Vec3(screenX, screenY, 0));
        const ripple = new Node('TapRipple');
        ripple.setParent(canvasNode);
        ripple.setPosition(localPoint);
        ripple.setSiblingIndex(canvasNode.children.length - 1);
        ripple.addComponent(UITransform).setContentSize(72, 72);

        const graphics = ripple.addComponent(Graphics);
        const opacity = ripple.addComponent(UIOpacity);
        opacity.opacity = 210;

        this.drawGlowRing(graphics);
        ripple.setScale(0.45, 0.45, 1);

        tween(ripple)
            .to(0.42, { scale: new Vec3(1.25, 1.25, 1) }, { easing: 'sineOut' })
            .call(() => {
                if (ripple && ripple.isValid) {
                    ripple.destroy();
                }
            })
            .start();

        tween(opacity)
            .to(0.42, { opacity: 0 }, { easing: 'sineOut' })
            .start();
    }

    private drawGlowRing(graphics: Graphics) {
        graphics.clear();

        const rings = [
            { radius: 14, width: 12, alpha: 28 },
            { radius: 14, width: 8, alpha: 58 },
            { radius: 14, width: 5, alpha: 120 },
            { radius: 14, width: 2.4, alpha: 235 },
            { radius: 14, width: 1.2, alpha: 180 },
        ];

        for (const ring of rings) {
            graphics.lineWidth = ring.width;
            graphics.strokeColor = new Color(85, 235, 255, ring.alpha);
            graphics.circle(0, 0, ring.radius);
            graphics.stroke();
        }
    }

    private moveSnakeUntilStopOrEscape(snake: SnakeData, startCells: GridPos[]) {
        // --- Pre-compute ALL grid steps at once ---
        type StepSnapshot = { cells: GridPos[]; visuals: VisualPoint[] };
        const steps: StepSnapshot[] = [];
        let collided = false;
        let hitSnake: SnakeData | null = null;

        // Step 0 = current state (before any move)
        steps.push({
            cells: cloneCells(snake.cells),
            visuals: this.buildSnakeVisualPoints(snake),
        });

        let simCells = cloneCells(snake.cells);
        const maxSteps = this.cols + this.rows + snake.cells.length + 4;

        for (let step = 0; step < maxSteps; step++) {
            const nh = {
                x: simCells[0].x + snake.direction.x,
                y: simCells[0].y + snake.direction.y,
            };

            if (!this.isOutsideBoard(nh)) {
                const blockingSnake = this.getBlockingSnakeAt(nh, snake.id);
                if (blockingSnake) {
                    collided = true;
                    hitSnake = blockingSnake;
                    break;
                }
            }

            simCells = getPulledCellsForward(simCells, nh);

            // Temporarily swap cells for visual calculation
            const saved = snake.cells;
            snake.cells = simCells;
            steps.push({
                cells: cloneCells(simCells),
                visuals: this.buildSnakeVisualPoints(snake),
            });
            snake.cells = saved;

            if (areCellsFullyOutsideBoard(simCells, this.cols, this.rows)) {
                break;
            }
        }

        const numMoves = steps.length - 1;
        if (numMoves <= 0) {
            if (collided) {
                this.animateCollisionBump(snake, startCells, hitSnake);
            }
            return;
        }

        this.soundManager?.playSnakeMove();

        // Apply final grid state immediately
        const finalStep = steps[steps.length - 1];
        snake.cells = cloneCells(finalStep.cells);
        const finalVisuals = finalStep.visuals;
        const totalTime = numMoves * this.gridStepMoveTime;

        // --- Animate each piece with one continuous tween chain ---
        let finishedCount = 0;

        for (let i = 0; i < snake.nodes.length; i++) {
            const node = snake.nodes[i];
            if (!node || !node.isValid) {
                finishedCount++;
                continue;
            }

            // Set sprite frame once (index-based, doesn't change during movement)
            const sprite = node.getComponent(Sprite);
            if (sprite) {
                sprite.spriteFrame = this.getSnakePieceFrameByVisualIndex(i, finalVisuals.length, snake);
                sprite.color = Color.WHITE;
                this.fitSpriteToOriginalAspect(node, sprite);
            }

            const baseScale = this.getSnakePieceScaleByVisualIndex(i, finalVisuals.length);
            const targetScale = new Vec3(baseScale, baseScale, 1);
            this.updateHeadEye(node, i);
            Tween.stopAllByTarget(node);

            // Build tween chain: one segment per grid step, synchronized across all pieces
            const tw = tween(node);
            const stepTime = this.gridStepMoveTime;

            for (let s = 1; s < steps.length; s++) {
                const prevVp = steps[s - 1].visuals[i];
                const curVp = steps[s].visuals[i];
                if (!prevVp || !curVp) continue;

                const prevPos = s === 1 ? node.position.clone() : prevVp.position;
                const curPos = curVp.position;
                const prevDir = prevVp.dir;
                const curDir = curVp.dir;

                // Check if direction changed (corner) within this step
                const dirChanged = prevDir.x !== curDir.x || prevDir.y !== curDir.y;

                if (dirChanged) {
                    // Route through corner waypoint
                    let wp: Vec3 | null = null;
                    if (prevDir.x !== 0 && curDir.y !== 0) {
                        wp = new Vec3(curPos.x, prevPos.y, 0);
                    } else if (prevDir.y !== 0 && curDir.x !== 0) {
                        wp = new Vec3(prevPos.x, curPos.y, 0);
                    }

                    if (wp && Vec3.distance(prevPos, wp) > 0.5 && Vec3.distance(wp, curPos) > 0.5) {
                        const d1 = Vec3.distance(prevPos, wp);
                        const d2 = Vec3.distance(wp, curPos);
                        const total = d1 + d2;
                        const t1 = total > 0.01 ? stepTime * (d1 / total) : stepTime * 0.5;
                        const t2 = stepTime - t1;

                        if (t1 > 0.001) {
                            tw.to(t1, { position: wp }, { easing: 'linear' });
                        }

                        // Rotate at the corner
                        const cornerVisual: VisualPoint = { position: curPos, dir: curDir };
                        tw.call(() => {
                            this.rotateSnakePiece(node, cornerVisual, i, finalVisuals.length);
                        });

                        if (t2 > 0.001) {
                            tw.to(t2, { position: curPos }, { easing: 'linear' });
                        }
                    } else {
                        // Corner too small, just do straight move with rotation
                        const visual: VisualPoint = { position: curPos, dir: curDir };
                        tw.call(() => {
                            this.rotateSnakePiece(node, visual, i, finalVisuals.length);
                        });
                        tw.to(stepTime, { position: curPos }, { easing: 'linear' });
                    }
                } else {
                    // Straight move — no corner
                    tw.to(stepTime, { position: curPos }, { easing: 'linear' });
                }
            }

            // Apply final scale at the end
            tw.call(() => {
                node.setScale(targetScale);
            });

            tw.call(() => {
                finishedCount++;
                if (finishedCount >= snake.nodes.length) {
                    this.applySnakeFinalVisualState(snake, finalVisuals);

                    if (collided) {
                        this.handleSnakeCollision(snake, startCells, hitSnake);
                    } else if (areCellsFullyOutsideBoard(snake.cells, this.cols, this.rows)) {
                        this.escapeSnake(snake);
                    }
                }
            }).start();
        }

        // Edge case: all nodes were invalid
        if (finishedCount >= snake.nodes.length) {
            this.applySnakeFinalVisualState(snake, finalVisuals);
            if (collided) {
                this.handleSnakeCollision(snake, startCells, hitSnake);
            } else if (areCellsFullyOutsideBoard(snake.cells, this.cols, this.rows)) {
                this.escapeSnake(snake);
            }
        }
    }

    /**
     * Special animation for collision at 1-cell distance.
     * Each piece moves slightly toward its actual next grid position
     * (head pulls, body follows proportionally, following corners!), then slides back.
     * Keep it soft because this branch is used when the blocker is directly in front.
     */
    private animateCollisionBump(snake: SnakeData, startCells: GridPos[], hitSnake: SnakeData | null) {
        // Apply penalty
        if (!this.penalizedSnakeIds.has(snake.id)) {
            this.currentLives = Math.max(0, this.currentLives - 1);
            this.updateHeartUI();
            this.penalizedSnakeIds.add(snake.id);
            this.soundManager?.playRevivePopup();
        }
        snake.canBePassedThrough = false;

        // Compute where each piece WOULD go after 1 full grid step
        const originalVisuals = this.buildSnakeVisualPoints(snake);
        const nh = {
            x: snake.cells[0].x + snake.direction.x,
            y: snake.cells[0].y + snake.direction.y,
        };
        const bumpedCells = getPulledCellsForward(snake.cells, nh);
        const savedCells = snake.cells;
        snake.cells = bumpedCells;
        const fullVisuals = this.buildSnakeVisualPoints(snake);
        snake.cells = savedCells;

        const fraction = 0.4;
        const bumpTime = 0.12;
        const returnTime = 0.16;

        let finishedCount = 0;
        let impactEffectPlayed = false;

        const playImpactEffect = () => {
            if (impactEffectPlayed) return;

            impactEffectPlayed = true;
            this.getSnakeFace(snake)?.playDizzy();
            this.playRedAuraOverlay();
            this.playHitSnakeLiftEffect(hitSnake);
        };

        for (let i = 0; i < snake.nodes.length; i++) {
            const node = snake.nodes[i];
            if (!node || !node.isValid) {
                finishedCount++;
                continue;
            }

            const origVp = originalVisuals[i];
            const fullVp = fullVisuals[i];
            if (!origVp || !fullVp) {
                finishedCount++;
                continue;
            }

            const startPos = node.position.clone();
            const fullEnd = fullVp.position;
            const prevDir = origVp.dir;
            const curDir = fullVp.dir;
            const dirChanged = prevDir.x !== curDir.x || prevDir.y !== curDir.y;

            let wp: Vec3 | null = null;
            if (dirChanged) {
                if (prevDir.x !== 0 && curDir.y !== 0) {
                    wp = new Vec3(fullEnd.x, startPos.y, 0);
                } else if (prevDir.y !== 0 && curDir.x !== 0) {
                    wp = new Vec3(startPos.x, fullEnd.y, 0);
                }
            }

            const d1 = wp ? Vec3.distance(startPos, wp) : Vec3.distance(startPos, fullEnd);
            const d2 = wp ? Vec3.distance(wp, fullEnd) : 0;
            const total = d1 + d2;
            const targetDist = fraction * total;

            Tween.stopAllByTarget(node);
            const tw = tween(node);

            if (wp && targetDist > d1 && d1 > 0.5) {
                // Crosses the corner midway through the soft bump
                const t1 = bumpTime * (d1 / targetDist);
                const t2 = bumpTime - t1;

                const bumpPos = new Vec3(
                    wp.x + (fullEnd.x - wp.x) * ((targetDist - d1) / d2),
                    wp.y + (fullEnd.y - wp.y) * ((targetDist - d1) / d2),
                    0
                );

                // Forward
                tw.to(t1, { position: wp }, { easing: 'sineOut' });
                const cornerVisual: VisualPoint = { position: bumpPos, dir: curDir };
                tw.call(() => {
                    this.rotateSnakePiece(node, cornerVisual, i, fullVisuals.length);
                });
                tw.to(t2, { position: bumpPos }, { easing: 'sineInOut' });
                tw.call(playImpactEffect);

                // Reverse
                tw.to(t2, { position: wp }, { easing: 'sineInOut' });
                const returnVisual: VisualPoint = { position: startPos, dir: prevDir };
                tw.call(() => {
                    this.rotateSnakePiece(node, returnVisual, i, originalVisuals.length);
                });
                tw.to(t1, { position: startPos }, { easing: 'sineOut' });
            } else {
                // Does not cross corner
                const targetPoint = wp && d1 > 0.5 ? wp : fullEnd;
                const distToTarget = Vec3.distance(startPos, targetPoint);
                const ratio = distToTarget > 0.01 ? targetDist / distToTarget : 0;

                const bumpPos = new Vec3(
                    startPos.x + (targetPoint.x - startPos.x) * ratio,
                    startPos.y + (targetPoint.y - startPos.y) * ratio,
                    0
                );

                if (targetPoint === fullEnd && dirChanged) {
                    const cornerVisual: VisualPoint = { position: bumpPos, dir: curDir };
                    tw.call(() => {
                        this.rotateSnakePiece(node, cornerVisual, i, fullVisuals.length);
                    });
                }

                tw.to(bumpTime, { position: bumpPos }, { easing: 'sineOut' });
                tw.call(playImpactEffect);
                tw.to(returnTime, { position: startPos }, { easing: 'sineInOut' });

                if (targetPoint === fullEnd && dirChanged) {
                    const returnVisual: VisualPoint = { position: startPos, dir: prevDir };
                    tw.call(() => {
                        this.rotateSnakePiece(node, returnVisual, i, originalVisuals.length);
                    });
                }
            }

            tw.call(() => {
                finishedCount++;
                if (finishedCount >= snake.nodes.length) {
                    this.applySnakeFinalVisualState(snake, originalVisuals);

                    snake.moving = false;
                    snake.canBePassedThrough = false;
                    if (this.currentLives <= 0) {
                        this.showGameOver();
                    }
                }
            }).start();
        }

        // Edge case: all nodes invalid
        if (finishedCount >= snake.nodes.length) {
            snake.moving = false;
            snake.canBePassedThrough = false;
            if (this.currentLives <= 0) {
                this.showGameOver();
            }
        }
    }

    private playCollisionNudge(snake: SnakeData, onImpact: () => void, onComplete: () => void) {
        const originalVisuals = this.buildSnakeVisualPoints(snake);
        const nextHead = {
            x: snake.cells[0].x + snake.direction.x,
            y: snake.cells[0].y + snake.direction.y,
        };
        const bumpedCells = getPulledCellsForward(snake.cells, nextHead);
        const savedCells = snake.cells;
        snake.cells = bumpedCells;
        const bumpedVisuals = this.buildSnakeVisualPoints(snake);
        snake.cells = savedCells;

        const fraction = 0.4;
        const bumpTime = this.gridStepMoveTime * fraction;
        const returnTime = bumpTime;
        let finishedCount = 0;
        let impactEffectPlayed = false;

        const playImpactEffect = () => {
            if (impactEffectPlayed) return;

            impactEffectPlayed = true;
            onImpact();
        };

        const finishOne = () => {
            finishedCount++;
            if (finishedCount < snake.nodes.length) return;

            this.applySnakeFinalVisualState(snake, originalVisuals);
            onComplete();
        };

        for (let i = 0; i < snake.nodes.length; i++) {
            const node = snake.nodes[i];
            const originalVisual = originalVisuals[i];
            const bumpedVisual = bumpedVisuals[i];

            if (!node || !node.isValid || !originalVisual || !bumpedVisual) {
                finishOne();
                continue;
            }

            const startPos = node.position.clone();
            const fullEnd = bumpedVisual.position;
            const prevDir = originalVisual.dir;
            const curDir = bumpedVisual.dir;
            const dirChanged = prevDir.x !== curDir.x || prevDir.y !== curDir.y;

            let waypoint: Vec3 | null = null;
            if (dirChanged) {
                if (prevDir.x !== 0 && curDir.y !== 0) {
                    waypoint = new Vec3(fullEnd.x, startPos.y, 0);
                } else if (prevDir.y !== 0 && curDir.x !== 0) {
                    waypoint = new Vec3(startPos.x, fullEnd.y, 0);
                }
            }

            const d1 = waypoint ? Vec3.distance(startPos, waypoint) : Vec3.distance(startPos, fullEnd);
            const d2 = waypoint ? Vec3.distance(waypoint, fullEnd) : 0;
            const total = d1 + d2;
            const targetDist = fraction * total;

            Tween.stopAllByTarget(node);
            const tw = tween(node);

            if (waypoint && targetDist > d1 && d1 > 0.5 && d2 > 0.5) {
                const t1 = bumpTime * (d1 / targetDist);
                const t2 = bumpTime - t1;
                const bumpPos = new Vec3(
                    waypoint.x + (fullEnd.x - waypoint.x) * ((targetDist - d1) / d2),
                    waypoint.y + (fullEnd.y - waypoint.y) * ((targetDist - d1) / d2),
                    0
                );

                tw.to(t1, { position: waypoint }, { easing: 'sineOut' });
                tw.call(() => {
                    this.rotateSnakePiece(node, { position: bumpPos, dir: curDir }, i, bumpedVisuals.length);
                });
                tw.to(t2, { position: bumpPos }, { easing: 'sineInOut' });
                tw.call(playImpactEffect);
                tw.to(t2, { position: waypoint }, { easing: 'sineInOut' });
                tw.call(() => {
                    this.rotateSnakePiece(node, { position: startPos, dir: prevDir }, i, originalVisuals.length);
                });
                tw.to(t1, { position: startPos }, { easing: 'sineOut' });
            } else {
                const targetPoint = waypoint && d1 > 0.5 ? waypoint : fullEnd;
                const distToTarget = Vec3.distance(startPos, targetPoint);
                const ratio = distToTarget > 0.01 ? targetDist / distToTarget : 0;
                const bumpPos = new Vec3(
                    startPos.x + (targetPoint.x - startPos.x) * ratio,
                    startPos.y + (targetPoint.y - startPos.y) * ratio,
                    0
                );

                if (targetPoint === fullEnd && dirChanged) {
                    tw.call(() => {
                        this.rotateSnakePiece(node, { position: bumpPos, dir: curDir }, i, bumpedVisuals.length);
                    });
                }

                tw.to(bumpTime, { position: bumpPos }, { easing: 'sineOut' });
                tw.call(playImpactEffect);
                tw.to(returnTime, { position: startPos }, { easing: 'sineInOut' });

                if (targetPoint === fullEnd && dirChanged) {
                    tw.call(() => {
                        this.rotateSnakePiece(node, { position: startPos, dir: prevDir }, i, originalVisuals.length);
                    });
                }
            }

            tw.call(finishOne).start();
        }

        if (snake.nodes.length <= 0) {
            playImpactEffect();
            onComplete();
        }
    }

    private applySnakeFinalVisualState(snake: SnakeData, visualPoints: VisualPoint[]) {
        for (let i = 0; i < snake.nodes.length; i++) {
            const node = snake.nodes[i];
            const visual = visualPoints[i];

            if (!node || !node.isValid || !visual) continue;

            node.setPosition(visual.position);
            this.rotateSnakePiece(node, visual, i, visualPoints.length);
            this.setSnakePieceBaseScale(node, i, visualPoints.length);
            this.updateHeadEye(node, i);
        }

        this.applySnakePieceLayerOrder(snake);
    }

    private bringSnakeToFront(snake: SnakeData) {
        this.applySnakePieceLayerOrder(snake);
    }

    private applySnakePieceLayerOrder(snake: SnakeData) {
        if (!this.snakeRoot || snake.nodes.length <= 0) return;

        // Render order inside one snake: tail pieces first, head last.
        // Higher sibling index draws on top in the UI hierarchy.
        for (let i = snake.nodes.length - 1; i >= 0; i--) {
            const node = snake.nodes[i];

            if (!node || !node.isValid) continue;

            node.setSiblingIndex(this.snakeRoot.children.length - 1);
            this.updateHeadEye(node, i);
        }
    }

    private escapeSnake(snake: SnakeData) {
        this.getSnakeFace(snake)?.playHappy();

        if (this.escapedCount === this.totalSnakeCount - 1) {
            const origin = this.pendingWinDotRippleOrigin || snake.nodes[0]?.position.clone() || null;
            this.playWinDotRippleEffect(origin);
            this.pendingWinDotRippleOrigin = null;
        }

        const moveSpeed = this.cellSize / this.gridStepMoveTime;
        const escapeOffset = this.getCanvasEscapeOffset(snake);
        const escapeDistance = Math.abs(escapeOffset.x) + Math.abs(escapeOffset.y);
        const moveTime = escapeDistance / moveSpeed;
        const fadeDelay = moveTime * 0.65;
        const fadeTime = moveTime - fadeDelay;

        let finished = 0;

        for (let i = 0; i < snake.nodes.length; i++) {
            const node = snake.nodes[i];

            if (!node || !node.isValid) {
                finished++;
                continue;
            }

            const target = node.position.clone().add(escapeOffset);
            const opacity = node.getComponent(UIOpacity) || node.addComponent(UIOpacity);
            opacity.opacity = 255;

            tween(node)
                .to(moveTime, { position: target }, { easing: 'linear' })
                .call(() => {
                    if (node && node.isValid) {
                        node.destroy();
                    }

                    finished++;

                    if (finished >= snake.nodes.length) {
                        snake.escaped = true;
                        snake.moving = false;
                        snake.canBePassedThrough = false;
                        snake.nodes = [];

                        this.escapedCount++;
                        this.updateSnakeCountLabel();
                        this.playSnakeEscapedUIEffect();
                        this.checkWin();
                    }
                })
                .start();

            tween(opacity)
                .delay(fadeDelay)
                .to(fadeTime, { opacity: 0 }, { easing: 'linear' })
                .start();
        }
    }

    private getCanvasEscapeOffset(snake: SnakeData): Vec3 {
        const canvasBounds = this.getCanvasBoundsInSnakeRootSpace();
        const snakeBounds = this.getSnakeBounds(snake);
        const margin = this.cellSize;

        if (snake.direction.x === 1) {
            return new Vec3(canvasBounds.maxX + margin - snakeBounds.minX, 0, 0);
        }

        if (snake.direction.x === -1) {
            return new Vec3(canvasBounds.minX - margin - snakeBounds.maxX, 0, 0);
        }

        if (snake.direction.y === 1) {
            return new Vec3(0, canvasBounds.minY - margin - snakeBounds.maxY, 0);
        }

        if (snake.direction.y === -1) {
            return new Vec3(0, canvasBounds.maxY + margin - snakeBounds.minY, 0);
        }

        return new Vec3();
    }

    private getSnakeBounds(snake: SnakeData): Bounds {
        const bounds: Bounds = {
            minX: Number.POSITIVE_INFINITY,
            maxX: Number.NEGATIVE_INFINITY,
            minY: Number.POSITIVE_INFINITY,
            maxY: Number.NEGATIVE_INFINITY,
        };

        for (const node of snake.nodes) {
            if (!node || !node.isValid) continue;

            const ui = node.getComponent(UITransform);
            if (!ui) continue;

            const box = ui.getBoundingBox();

            bounds.minX = Math.min(bounds.minX, box.x);
            bounds.maxX = Math.max(bounds.maxX, box.x + box.width);
            bounds.minY = Math.min(bounds.minY, box.y);
            bounds.maxY = Math.max(bounds.maxY, box.y + box.height);
        }

        return bounds;
    }

    private getCanvasBoundsInSnakeRootSpace(): Bounds {
        const canvasNode = this.getCanvasNode();
        const canvasUi = canvasNode.getComponent(UITransform);
        const snakeRootUi = this.snakeRoot.getComponent(UITransform);

        if (!canvasUi || !snakeRootUi) {
            const fallbackWidth = this.cols * this.cellSize;
            const fallbackHeight = this.rows * this.cellSize;

            return {
                minX: -fallbackWidth / 2,
                maxX: fallbackWidth / 2,
                minY: -fallbackHeight / 2,
                maxY: fallbackHeight / 2,
            };
        }

        const size = canvasUi.contentSize;
        const halfWidth = size.width / 2;
        const halfHeight = size.height / 2;
        const corners = [
            new Vec3(-halfWidth, -halfHeight, 0),
            new Vec3(halfWidth, -halfHeight, 0),
            new Vec3(-halfWidth, halfHeight, 0),
            new Vec3(halfWidth, halfHeight, 0),
        ];

        const bounds: Bounds = {
            minX: Number.POSITIVE_INFINITY,
            maxX: Number.NEGATIVE_INFINITY,
            minY: Number.POSITIVE_INFINITY,
            maxY: Number.NEGATIVE_INFINITY,
        };

        for (const corner of corners) {
            const worldPoint = canvasUi.convertToWorldSpaceAR(corner);
            const localPoint = snakeRootUi.convertToNodeSpaceAR(worldPoint);

            bounds.minX = Math.min(bounds.minX, localPoint.x);
            bounds.maxX = Math.max(bounds.maxX, localPoint.x);
            bounds.minY = Math.min(bounds.minY, localPoint.y);
            bounds.maxY = Math.max(bounds.maxY, localPoint.y);
        }

        return bounds;
    }

    private getCanvasNode(): Node {
        let current: Node | null = this.node;
        let canvasNode = this.node;

        while (current) {
            if (current.getComponent(UITransform)) {
                canvasNode = current;
            }

            current = current.parent;
        }

        return canvasNode;
    }

    private ensureCanvasMask() {
        const canvasNode = this.getCanvasNode();
        let mask = canvasNode.getComponent(Mask);

        if (!mask) {
            mask = canvasNode.addComponent(Mask);
        }

        mask.type = Mask.Type.RECT;
    }

    private pullSnakeForward(snake: SnakeData, nextHead: GridPos) {
        snake.cells = getPulledCellsForward(snake.cells, nextHead);
    }

    private willSnakeCollide(snake: SnakeData): boolean {
        let simulatedCells = cloneCells(snake.cells);
        const maxSteps = this.cols + this.rows + simulatedCells.length + 4;

        for (let step = 0; step < maxSteps; step++) {
            const nextHead = {
                x: simulatedCells[0].x + snake.direction.x,
                y: simulatedCells[0].y + snake.direction.y,
            };

            if (!this.isOutsideBoard(nextHead)) {
                const blockingSnake = this.getBlockingSnakeAt(nextHead, snake.id);

                if (blockingSnake) {
                    return true;
                }
            }

            simulatedCells = getPulledCellsForward(simulatedCells, nextHead);

            if (areCellsFullyOutsideBoard(simulatedCells, this.cols, this.rows)) {
                return false;
            }
        }

        return false;
    }

    private getBlockingSnakeAt(pos: GridPos, currentSnakeId: number): SnakeData | null {
        if (this.isOutsideBoard(pos)) {
            return null;
        }

        for (const snake of this.snakes) {
            if (snake.escaped) continue;
            if (snake.moving && snake.canBePassedThrough) continue;
            if (snake.id === currentSnakeId) continue;

            for (const cell of snake.cells) {
                if (cell.x === pos.x && cell.y === pos.y) {
                    return snake;
                }
            }
        }

        return null;
    }

    private handleSnakeCollision(snake: SnakeData, startCells: GridPos[], hitSnake: SnakeData | null) {
        if (!this.penalizedSnakeIds.has(snake.id)) {
            this.currentLives = Math.max(0, this.currentLives - 1);
            this.updateHeartUI();
            this.penalizedSnakeIds.add(snake.id);
            this.soundManager?.playRevivePopup();
        }

        snake.canBePassedThrough = false;

        this.playCollisionNudge(
            snake,
            () => {
                this.getSnakeFace(snake)?.playDizzy();
                this.playRedAuraOverlay();
                this.playHitSnakeLiftEffect(hitSnake);
            },
            () => {
                this.returnSnakeToStartPosition(snake, startCells, () => {
                    if (this.currentLives <= 0) {
                        this.showGameOver();
                    }
                });
            }
        );
    }

    private returnSnakeToStartPosition(
        snake: SnakeData,
        startCells: GridPos[],
        onComplete?: () => void
    ) {
        if (snake.nodes.length <= 0) {
            snake.moving = false;
            snake.canBePassedThrough = false;
            if (onComplete) onComplete();
            return;
        }

        // Build the reverse path: from current position back to start,
        // step-by-step along the same grid path the snake traveled.
        type StepSnapshot = { cells: GridPos[]; visuals: VisualPoint[] };
        const reverseSteps: StepSnapshot[] = [];

        // Simulate forward from startCells to current cells to get ALL intermediate states
        let simCells = cloneCells(startCells);
        const forwardSteps: StepSnapshot[] = [];

        const savedCells = snake.cells;
        snake.cells = simCells;
        forwardSteps.push({
            cells: cloneCells(simCells),
            visuals: this.buildSnakeVisualPoints(snake),
        });
        snake.cells = savedCells;

        const maxSteps = this.cols + this.rows + snake.cells.length + 4;
        for (let step = 0; step < maxSteps; step++) {
            const nh = {
                x: simCells[0].x + snake.direction.x,
                y: simCells[0].y + snake.direction.y,
            };
            simCells = getPulledCellsForward(simCells, nh);

            snake.cells = simCells;
            forwardSteps.push({
                cells: cloneCells(simCells),
                visuals: this.buildSnakeVisualPoints(snake),
            });
            snake.cells = savedCells;

            // Check if we've reached the current (collision) position
            const currentHead = savedCells[0];
            if (simCells[0].x === currentHead.x && simCells[0].y === currentHead.y) {
                break;
            }
        }

        // Reverse the forward steps to get the return path
        for (let s = forwardSteps.length - 1; s >= 0; s--) {
            reverseSteps.push(forwardSteps[s]);
        }

        // Apply start cells as final state
        snake.cells = cloneCells(startCells);
        const finalVisuals = reverseSteps[reverseSteps.length - 1].visuals;

        const numMoves = reverseSteps.length - 1;
        if (numMoves <= 0) {
            this.applySnakeFinalVisualState(snake, finalVisuals);
            snake.moving = false;
            snake.canBePassedThrough = false;
            if (onComplete) onComplete();
            return;
        }

        // Return speed: slower than forward movement
        const returnTimePerStep = this.gridStepMoveTime / SNAKE_RETURN_SPEED_FACTOR;
        const totalTime = numMoves * returnTimePerStep;

        let finishedCount = 0;

        for (let i = 0; i < snake.nodes.length; i++) {
            const node = snake.nodes[i];
            if (!node || !node.isValid) {
                finishedCount++;
                if (finishedCount >= snake.nodes.length) {
                    snake.moving = false;
                    snake.canBePassedThrough = false;
                    if (onComplete) onComplete();
                }
                continue;
            }

            const sprite = node.getComponent(Sprite);
            if (sprite) {
                sprite.spriteFrame = this.getSnakePieceFrameByVisualIndex(i, finalVisuals.length, snake);
                sprite.color = Color.WHITE;
                this.fitSpriteToOriginalAspect(node, sprite);
            }

            const baseScale = this.getSnakePieceScaleByVisualIndex(i, finalVisuals.length);
            const targetScale = new Vec3(baseScale, baseScale, 1);
            this.updateHeadEye(node, i);
            Tween.stopAllByTarget(node);

            // Build path for this piece through all reverse steps
            const pathPoints: { pos: Vec3; dir: GridPos }[] = [];

            for (let s = 0; s < reverseSteps.length; s++) {
                const vp = reverseSteps[s].visuals[i];
                if (!vp) continue;

                const prevDir = pathPoints.length > 0
                    ? pathPoints[pathPoints.length - 1].dir
                    : null;
                const curDir = vp.dir;

                if (prevDir && (prevDir.x !== curDir.x || prevDir.y !== curDir.y)) {
                    const prevPos = pathPoints[pathPoints.length - 1].pos;
                    const curPos = vp.position;
                    let wp: Vec3 | null = null;

                    if (prevDir.x !== 0 && curDir.y !== 0) {
                        wp = new Vec3(curPos.x, prevPos.y, 0);
                    } else if (prevDir.y !== 0 && curDir.x !== 0) {
                        wp = new Vec3(prevPos.x, curPos.y, 0);
                    }

                    if (wp) {
                        const d1 = Vec3.distance(prevPos, wp);
                        const d2 = Vec3.distance(wp, curPos);
                        if (d1 > 0.5 && d2 > 0.5) {
                            pathPoints.push({ pos: wp, dir: prevDir });
                        }
                    }
                }

                pathPoints.push({ pos: vp.position, dir: curDir });
            }

            if (pathPoints.length < 2) {
                finishedCount++;
                if (finishedCount >= snake.nodes.length) {
                    snake.moving = false;
                    snake.canBePassedThrough = false;
                    if (onComplete) onComplete();
                }
                continue;
            }

            let totalDist = 0;
            for (let p = 1; p < pathPoints.length; p++) {
                totalDist += Vec3.distance(pathPoints[p - 1].pos, pathPoints[p].pos);
            }
            if (totalDist < 0.01) totalDist = 1;

            const tw = tween(node);
            let lastAppliedDir = pathPoints[0].dir;

            for (let p = 1; p < pathPoints.length; p++) {
                const segDist = Vec3.distance(pathPoints[p - 1].pos, pathPoints[p].pos);
                const segTime = totalTime * (segDist / totalDist);
                const segTarget = pathPoints[p].pos;
                const segDir = pathPoints[p].dir;
                const isLast = p === pathPoints.length - 1;

                if (lastAppliedDir.x !== segDir.x || lastAppliedDir.y !== segDir.y) {
                    const newVisual: VisualPoint = { position: segTarget, dir: segDir };
                    tw.call(() => {
                        this.rotateSnakePiece(node, newVisual, i, finalVisuals.length);
                    });
                    lastAppliedDir = segDir;
                }

                if (segTime > 0.001) {
                    if (isLast) {
                        tw.to(segTime, { position: segTarget, scale: targetScale }, { easing: 'sineOut' });
                    } else {
                        tw.to(segTime, { position: segTarget }, { easing: 'linear' });
                    }
                } else {
                    tw.call(() => { node.setPosition(segTarget); });
                }
            }

            tw.call(() => {
                finishedCount++;
                if (finishedCount >= snake.nodes.length) {
                    this.applySnakeFinalVisualState(snake, finalVisuals);
                    snake.moving = false;
                    snake.canBePassedThrough = false;
                    if (onComplete) onComplete();
                }
            }).start();
        }
    }

    private isOutsideBoard(pos: GridPos): boolean {
        return isOutsideBoard(pos, this.cols, this.rows);
    }

    private isSnakeFullyOutsideBoard(snake: SnakeData): boolean {
        return areCellsFullyOutsideBoard(snake.cells, this.cols, this.rows);
    }

    private updateSnakeCountLabel() {
        if (this.snakeCountLabel) {
            this.snakeCountLabel.string = `${this.escapedCount}/${this.totalSnakeCount}`;
        }
    }

    private updateHeartUI() {
        const previousLives = this.renderedLives;

        for (let i = 0; i < this.heartIcons.length; i++) {
            const heart = this.heartIcons[i];

            if (!heart || !heart.isValid) continue;

            heart.active = true;

            const sprite = heart.getComponent(Sprite);
            if (!sprite) continue;

            const frame = i < this.currentLives
                ? this.heartFullFrame
                : this.heartEmptyFrame;

            const wasFull = previousLives < 0 || i < previousLives;
            const isFull = i < this.currentLives;

            if (wasFull && !isFull && previousLives >= 0) {
                this.playHeartLostEffect(heart, sprite);
            } else if (frame) {
                Tween.stopAllByTarget(heart);

                if (previousLives === -1) {
                    // Hiệu ứng "đặt tim vào khung"
                    // Đầu tiên luôn hiện khung tim trống
                    sprite.spriteFrame = this.heartEmptyFrame;
                    heart.setScale(1, 1, 1);
                    heart.angle = 0;

                    if (isFull) {
                        tween(heart)
                            .delay(i * 0.35) // Trì hoãn rất lâu (0.35s) để từng tim rơi xuống rõ rệt
                            .call(() => {
                                // Đổi sang hình tim đầy và phóng to hẳn lên (1.8x)
                                this.soundManager?.playHeartSwish();
                                sprite.spriteFrame = this.heartFullFrame;
                                heart.setScale(1.8, 1.8, 1);
                            })
                            // Thời gian stamp kéo dài ra 0.8s tạo cảm giác rớt xuống rất từ từ
                            .to(0.8, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                            .start();
                    }
                } else {
                    sprite.spriteFrame = frame;
                    heart.setScale(1, 1, 1);
                    heart.angle = 0;
                }
            }
        }

        this.renderedLives = this.currentLives;
    }

    private playHeartLostEffect(heart: Node, sprite: Sprite) {
        playHeartLostAnimation(heart, sprite, this.heartFullFrame, this.heartEmptyFrame);
    }

    private playSnakeEscapedUIEffect() {
        if (!this.snakeCountLabel) return;

        playNodePop(this.snakeCountLabel.node);
    }

    private checkWin() {
        if (this.escapedCount < this.totalSnakeCount) return;

        this.isPlaying = false;
        const winPanel = this.getWinPanelNode();

        if (winPanel && this.isWinDotRipplePlaying) {
            this.scheduleOnce(() => {
                if (winPanel && winPanel.isValid) {
                    this.showWinPanelWithEffects(winPanel);
                }
            }, 1.05);
        } else if (winPanel) {
            this.showWinPanelWithEffects(winPanel);
        }
    }

    private showWinPanelWithEffects(winPanel: Node) {
        if (this.hasShownWinEffects) return;

        this.hasShownWinEffects = true;
        this.soundManager?.playWinPopup();
        this.showEndPanel(winPanel);
        this.setWinLabelVisible(false);
        this.scheduleOnce(this.playLevelCompleteEffectCallback, 0.2);
        this.scheduleOnce(this.playEndgameImageEffectsCallback, 0.28);
    }

    private showGameOver() {
        this.isPlaying = false;
        const losePanel = this.getLosePanelNode();
        this.showEndPanel(losePanel);
        this.soundManager?.playLosePopup();
        this.applyLosePanelContent('No hearts left!', null);

        if (this.winTitleLabel) {
            this.winTitleLabel.string = 'GAME OVER';
        }
    }

    private updateTimeLabel() {
        if (!this.timeLabel) return;

        const totalSeconds = Math.ceil(this.remainingTime);
        if (
            this.isPlaying &&
            totalSeconds > 0 &&
            totalSeconds <= this.tickTockStartSeconds &&
            totalSeconds !== this.lastRenderedSecond
        ) {
            this.soundManager?.playTickTock();
        }

        this.lastRenderedSecond = totalSeconds;

        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        const minuteText = minutes.toString().padStart(2, '0');
        const secondText = seconds.toString().padStart(2, '0');

        this.timeLabel.string = `${minuteText}:${secondText}`;
    }

    private startLevelTimer() {
        if (this.hasTimerStarted) return;

        this.hasTimerStarted = true;
        this.lastRenderedSecond = Math.ceil(this.remainingTime);
    }

    private onTimeUp() {
        if (!this.hasPlayedTimeoutSound) {
            this.hasPlayedTimeoutSound = true;
            this.soundManager?.playTimeout();
        }

        this.isPlaying = false;
        const losePanel = this.getLosePanelNode();
        this.showEndPanel(losePanel);
        this.soundManager?.playLosePopup();
        this.applyLosePanelContent('Out of time!', this.timeoutLoseFrame);
    }

    private applyLosePanelContent(message: string, iconFrame: SpriteFrame | null) {
        if (this.finalTextLabel) {
            this.finalTextLabel.string = message;
        }

        const losePanel = this.getLosePanelNode();
        const loseIconNode = losePanel
            ? this.findChildByNameDeep(losePanel, 'Lose')
            : this.findChildByNameDeep(this.node.scene, 'Lose');
        const loseIcon = loseIconNode?.getComponent(Sprite) || null;
        if (!loseIcon) return;

        if (!this.defaultLoseFrame) {
            this.defaultLoseFrame = loseIcon.spriteFrame;
        }

        const nextFrame = iconFrame || this.defaultLoseFrame;
        if (nextFrame) {
            loseIcon.spriteFrame = nextFrame;
        }
    }

    private setBackgroundDimmed(dimmed: boolean) {
        if (dimmed) {
            this.showDimBackdrop();
        } else {
            this.hideDimBackdrop();
        }
    }

    private showEndPanel(panel: Node | null) {
        if (!panel || !panel.isValid) return;

        this.activeEndPanel = panel;
        this.setBackgroundDimmed(true);
        panel.active = true;
        panel.setSiblingIndex(panel.parent ? panel.parent.children.length - 1 : 0);
        this.playEndPanelIntroEffect(panel);
    }

    private hideEndPanel(panel: Node | null) {
        if (!panel || !panel.isValid) return;

        Tween.stopAllByTarget(panel);
        panel.active = false;
        panel.setScale(1, 1, 1);
        const opacity = panel.getComponent(UIOpacity);
        if (opacity) {
            Tween.stopAllByTarget(opacity);
            opacity.opacity = 255;
        }
    }

    private showDimBackdrop() {
        const backdrop = this.getLoseBackdropNode();
        if (!backdrop || !backdrop.isValid) return;

        backdrop.active = true;

        const opacity = backdrop.getComponent(UIOpacity) || backdrop.addComponent(UIOpacity);
        Tween.stopAllByTarget(opacity);
        opacity.opacity = 0;

        backdrop.setSiblingIndex(backdrop.parent ? backdrop.parent.children.length - 1 : 0);

        if (this.activeEndPanel && this.activeEndPanel.isValid) {
            this.activeEndPanel.setSiblingIndex(this.activeEndPanel.parent ? this.activeEndPanel.parent.children.length - 1 : 0);
        }

        tween(opacity)
            .to(1.05, { opacity: 240 }, { easing: 'sineOut' })
            .start();
    }

    private playEndPanelIntroEffect(panel: Node) {
        const opacity = panel.getComponent(UIOpacity) || panel.addComponent(UIOpacity);
        Tween.stopAllByTarget(panel);
        Tween.stopAllByTarget(opacity);

        opacity.opacity = 0;
        panel.setScale(0.82, 0.82, 1);

        tween(opacity)
            .to(0.36, { opacity: 255 }, { easing: 'sineOut' })
            .start();

        tween(panel)
            .to(0.58, { scale: new Vec3(1.06, 1.06, 1) }, { easing: 'backOut' })
            .to(0.26, { scale: new Vec3(1, 1, 1) }, { easing: 'sineOut' })
            .start();
    }

    private hideDimBackdrop() {
        const backdrop = this.getLoseBackdropNode();
        if (!backdrop || !backdrop.isValid) return;

        const opacity = backdrop.getComponent(UIOpacity) || backdrop.addComponent(UIOpacity);
        Tween.stopAllByTarget(opacity);
        opacity.opacity = 0;
        backdrop.active = false;
    }

    private getLoseBackdropNode(): Node | null {
        if (this.loseBackdropNode && this.loseBackdropNode.isValid) {
            return this.loseBackdropNode;
        }

        this.loseBackdropNode =
            this.findChildByNameDeep(this.node.scene, 'LoseBackdrop') ||
            this.findChildByNameDeep(this.node.scene, 'LoseBackdropOverlay') ||
            null;

        return this.loseBackdropNode;
    }

    private getLosePanelNode(): Node | null {
        return this.findChildByNameDeep(this.node.scene, 'LosePanel') || this.winPanel || null;
    }

    private getWinPanelNode(): Node | null {
        return this.findChildByNameDeep(this.node.scene, 'WinPanel');
    }

    private setWinLabelVisible(visible: boolean) {
        const winPanel = this.getWinPanelNode();
        const winLabel = winPanel
            ? this.findChildByNameDeep(winPanel, 'WinLabel')
            : this.findChildByNameDeep(this.node.scene, 'WinLabel');

        if (winLabel && winLabel.isValid) {
            winLabel.active = visible;
        }
    }

    private playLevelCompleteEffect() {
        const effect = this.getLevelCompleteEffect();
        if (effect) {
            this.positionLevelCompleteEffect(effect.node);
        }

        effect?.play();
    }

    private hideLevelCompleteEffect() {
        const effect = this.getLevelCompleteEffect(false);
        effect?.hide();
    }

    private getLevelCompleteEffect(allowCreate: boolean = true): LevelCompleteEffect | null {
        if (
            this.levelCompleteEffect &&
            this.levelCompleteEffect.node &&
            this.levelCompleteEffect.node.isValid
        ) {
            return this.levelCompleteEffect;
        }

        const existingNode =
            (this.levelCompleteEffectNode && this.levelCompleteEffectNode.isValid ? this.levelCompleteEffectNode : null) ||
            this.findChildByNameDeep(this.node.scene, 'LevelCompleteEffect');
        const existingEffect = existingNode?.getComponent(LevelCompleteEffect) || null;

        if (existingEffect) {
            this.levelCompleteEffectNode = existingNode;
            this.levelCompleteEffect = existingEffect;
            return existingEffect;
        }

        if (!allowCreate || !this.levelCompleteEffectPrefab) return null;

        const effectNode = instantiate(this.levelCompleteEffectPrefab);
        effectNode.name = 'LevelCompleteEffect';
        effectNode.setParent(this.getCanvasNode());
        this.positionLevelCompleteEffect(effectNode);

        this.levelCompleteEffectNode = effectNode;
        this.levelCompleteEffect = effectNode.getComponent(LevelCompleteEffect);

        return this.levelCompleteEffect;
    }

    private positionLevelCompleteEffect(effectNode: Node) {
        const winPanel = this.getWinPanelNode();
        const winLabel = winPanel
            ? this.findChildByNameDeep(winPanel, 'WinLabel')
            : this.findChildByNameDeep(this.node.scene, 'WinLabel');
        const canvasNode = this.getCanvasNode();
        const canvasUi = canvasNode.getComponent(UITransform);
        const labelParentUi = winLabel?.parent?.getComponent(UITransform) || null;

        effectNode.setParent(canvasNode);
        effectNode.setScale(this.levelCompleteEffectScale, this.levelCompleteEffectScale, 1);

        if (!winLabel || !winLabel.isValid || !canvasUi || !labelParentUi) {
            effectNode.setPosition(0, 105, 0);
            return;
        }

        const worldPosition = labelParentUi.convertToWorldSpaceAR(winLabel.position);
        const localPosition = canvasUi.convertToNodeSpaceAR(worldPosition);
        effectNode.setPosition(localPosition.x, localPosition.y, 0);
    }

    private playEndgameImageEffects() {
        if (this.endgameEffectFrames.length <= 0) return;

        this.hideEndgameImageEffects();

        const canvasNode = this.getCanvasNode();
        const root = new Node('EndgameImageEffects');
        root.setParent(canvasNode);
        root.addComponent(UITransform);
        root.setPosition(this.getEndgameImageEffectPosition());
        root.setSiblingIndex(canvasNode.children.length - 1);
        this.endgameEffectRoot = root;

        const layouts = [
            { startX: -10, startY: -18, endX: -184, peakY: 92, endY: 18, angle: -34, spin: -270, scale: 1.42 },
            { startX: -6, startY: -16, endX: -148, peakY: 116, endY: 36, angle: 18, spin: 250, scale: 1.28 },
            { startX: -3, startY: -20, endX: -108, peakY: 82, endY: 8, angle: -12, spin: -225, scale: 1.34 },
            { startX: 0, startY: -15, endX: -62, peakY: 126, endY: 42, angle: 16, spin: 235, scale: 1.22 },
            { startX: 3, startY: -21, endX: -24, peakY: 98, endY: 20, angle: -20, spin: -240, scale: 1.36 },
            { startX: 7, startY: -18, endX: 30, peakY: 120, endY: 34, angle: 30, spin: 260, scale: 1.30 },
            { startX: 10, startY: -16, endX: 72, peakY: 88, endY: 12, angle: -26, spin: -230, scale: 1.38 },
            { startX: 6, startY: -19, endX: 118, peakY: 128, endY: 44, angle: 22, spin: 245, scale: 1.24 },
            { startX: 3, startY: -17, endX: 154, peakY: 108, endY: 32, angle: -18, spin: -255, scale: 1.32 },
            { startX: 9, startY: -20, endX: 190, peakY: 84, endY: 16, angle: 32, spin: 275, scale: 1.44 },
            { startX: -4, startY: -24, endX: -132, peakY: 62, endY: -18, angle: -8, spin: -180, scale: 1.18 },
            { startX: 4, startY: -24, endX: 136, peakY: 66, endY: -16, angle: 10, spin: 190, scale: 1.18 },
            { startX: -2, startY: -22, endX: -76, peakY: 72, endY: -10, angle: 24, spin: 205, scale: 1.12 },
            { startX: 2, startY: -22, endX: 82, peakY: 76, endY: -8, angle: -24, spin: -205, scale: 1.12 },
            { startX: -7, startY: -14, endX: -170, peakY: 132, endY: 50, angle: 12, spin: 220, scale: 1.16 },
            { startX: 7, startY: -14, endX: 174, peakY: 136, endY: 52, angle: -12, spin: -220, scale: 1.16 },
            { startX: -1, startY: -18, endX: -36, peakY: 138, endY: 48, angle: -30, spin: -260, scale: 1.20 },
            { startX: 1, startY: -18, endX: 42, peakY: 142, endY: 50, angle: 30, spin: 260, scale: 1.20 },
        ];
        const effectCount = Math.max(layouts.length, this.endgameEffectFrames.length);

        for (let i = 0; i < effectCount; i++) {
            const frame = this.endgameEffectFrames[i % this.endgameEffectFrames.length];
            if (!frame) continue;

            const layout = layouts[i % layouts.length];
            const node = new Node(`EndgameEffect_${i + 1}`);
            node.setParent(root);
            node.setPosition(layout.startX, layout.startY, 0);
            node.angle = layout.angle;
            node.setScale(0.1, 0.1, 1);

            const ui = node.addComponent(UITransform);
            ui.setContentSize(28, 28);

            const sprite = node.addComponent(Sprite);
            sprite.spriteFrame = frame;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;

            const opacity = node.addComponent(UIOpacity);
            opacity.opacity = 0;

            const delay = (i % 10) * 0.026 + Math.floor(i / 10) * 0.08;
            const peakPosition = new Vec3(layout.endX * 0.72, layout.peakY, 0);
            const endPosition = new Vec3(layout.endX, layout.endY, 0);

            tween(opacity)
                .delay(delay)
                .to(0.08, { opacity: 255 }, { easing: 'sineOut' })
                .delay(0.52)
                .to(0.32, { opacity: 0 }, { easing: 'sineIn' })
                .start();

            tween(node)
                .delay(delay)
                .to(0.28, {
                    position: peakPosition,
                    scale: new Vec3(layout.scale * 1.12, layout.scale * 1.12, 1),
                    angle: layout.angle + layout.spin * 0.45,
                }, { easing: 'quadOut' })
                .to(0.58, {
                    position: endPosition,
                    scale: new Vec3(layout.scale * 0.72, layout.scale * 0.72, 1),
                    angle: layout.angle + layout.spin,
                }, { easing: 'quadIn' })
                .call(() => {
                    if (node && node.isValid) {
                        node.destroy();
                    }
                })
                .start();
        }
    }

    private hideEndgameImageEffects() {
        if (!this.endgameEffectRoot || !this.endgameEffectRoot.isValid) {
            this.endgameEffectRoot = null;
            return;
        }

        for (const child of this.endgameEffectRoot.children) {
            Tween.stopAllByTarget(child);
            const opacity = child.getComponent(UIOpacity);
            if (opacity) {
                Tween.stopAllByTarget(opacity);
            }
        }

        this.endgameEffectRoot.destroy();
        this.endgameEffectRoot = null;
    }

    private getEndgameImageEffectPosition(): Vec3 {
        const canvasNode = this.getCanvasNode();
        const canvasUi = canvasNode.getComponent(UITransform);
        const winPanel = this.getWinPanelNode();
        const winLabel = winPanel
            ? this.findChildByNameDeep(winPanel, 'WinLabel')
            : this.findChildByNameDeep(this.node.scene, 'WinLabel');
        const playAgainButton = winPanel
            ? this.findChildByNameDeep(winPanel, 'PlayAgainButton')
            : this.findChildByNameDeep(this.node.scene, 'PlayAgainButton');
        const winLabelPosition = this.getNodeCanvasPosition(winLabel, canvasUi);
        const playAgainPosition = this.getNodeCanvasPosition(playAgainButton, canvasUi);

        if (winLabelPosition && playAgainPosition) {
            return new Vec3(
                (winLabelPosition.x + playAgainPosition.x) * 0.5,
                winLabelPosition.y * 0.24 + playAgainPosition.y * 0.76 + 18,
                0,
            );
        }

        return new Vec3(0, -52, 0);
    }

    private getNodeCanvasPosition(node: Node | null | undefined, canvasUi: UITransform | null): Vec3 | null {
        const parentUi = node?.parent?.getComponent(UITransform) || null;
        if (!node || !node.isValid || !canvasUi || !parentUi) return null;

        const worldPosition = parentUi.convertToWorldSpaceAR(node.position);
        return canvasUi.convertToNodeSpaceAR(worldPosition);
    }

    private playWinDotRippleEffect(originInSnakeRoot: Vec3 | null) {
        if (this.isWinDotRipplePlaying || !originInSnakeRoot || !this.dotGrid || !this.snakeRoot) return;

        const dotGridUi = this.dotGrid.getComponent(UITransform);
        const snakeRootUi = this.snakeRoot.getComponent(UITransform);
        if (!dotGridUi || !snakeRootUi) return;

        this.isWinDotRipplePlaying = true;

        const worldOrigin = snakeRootUi.convertToWorldSpaceAR(originInSnakeRoot);
        const origin = dotGridUi.convertToNodeSpaceAR(worldOrigin);
        const dots = this.dotGrid.children.filter(dot => dot && dot.isValid);

        let maxDistance = 1;
        for (const dot of dots) {
            maxDistance = Math.max(maxDistance, Vec3.distance(dot.position, origin));
        }

        for (const dot of dots) {
            const startPos = dot.position.clone();
            const distance = Vec3.distance(startPos, origin);
            const normalized = this.clamp(distance / maxDistance, 0, 1);
            const angle = Math.atan2(startPos.y - origin.y, startPos.x - origin.x);
            const organicOffset = (Math.sin(startPos.x * 0.07 + startPos.y * 0.11) + 1) * 0.025;
            const delay = normalized * 0.72 + organicOffset;
            const pushDistance = 8 + normalized * 7;
            const targetPos = new Vec3(
                startPos.x + Math.cos(angle) * pushDistance,
                startPos.y + Math.sin(angle) * pushDistance,
                startPos.z,
            );
            const opacity = dot.getComponent(UIOpacity) || dot.addComponent(UIOpacity);

            Tween.stopAllByTarget(dot);
            Tween.stopAllByTarget(opacity);
            opacity.opacity = 255;
            dot.setScale(1, 1, 1);
            dot.active = true;

            tween(dot)
                .delay(delay)
                .to(0.18, {
                    scale: new Vec3(1.35, 1.35, 1),
                    position: targetPos,
                }, { easing: 'sineOut' })
                .to(0.28, {
                    scale: new Vec3(0.08, 0.08, 1),
                }, { easing: 'sineIn' })
                .start();

            tween(opacity)
                .delay(delay + 0.08)
                .to(0.34, { opacity: 0 }, { easing: 'sineIn' })
                .call(() => {
                    if (dot && dot.isValid) {
                        dot.active = false;
                        dot.setPosition(startPos);
                        dot.setScale(1, 1, 1);
                    }
                })
                .start();
        }
    }

    private playBlockedEffect(snake: SnakeData) {
        playSnakeBlockedShake(snake);
    }

    private playRedAuraOverlay() {
        playRedAuraAnimation(this.getRedAuraNode(), this.getCanvasNode());
    }

    private prepareRedAuraOverlay() {
        prepareRedAuraAnimation(this.getRedAuraNode());
    }

    private getRedAuraNode(): Node | null {
        if (this.redAuraNode && this.redAuraNode.isValid) {
            return this.redAuraNode;
        }

        return this.getCanvasNode().getChildByName('redaura');
    }

    private playSnakeTapEffect(snake: SnakeData) {
        playSnakeTapAnimation(snake, (index, total) => this.getSnakePieceScaleByVisualIndex(index, total));
    }

    private playSnakeTapVibration() {
        const now = Date.now();
        if (now - this.lastSnakeTapVibrationTime < this.snakeTapVibrationCooldownMs) return;

        const navigatorLike = globalThis as {
            navigator?: {
                vibrate?: (pattern: number | number[]) => boolean;
            };
        };

        navigatorLike.navigator?.vibrate?.(18);
        this.lastSnakeTapVibrationTime = now;
    }

    private playGameAreaIntroEffect() {
        if (!this.gameArea || !this.gameArea.isValid) return;

        const targetScale = this.zoomScale;
        const startScale = targetScale * 0.10;
        const overshootScale = targetScale * 1.08;

        Tween.stopAllByTarget(this.gameArea);
        this.gameArea.setScale(startScale, startScale, 1);

        tween(this.gameArea)
            .to(0.72, { scale: new Vec3(overshootScale, overshootScale, 1) }, { easing: 'quadOut' })
            .to(0.22, { scale: new Vec3(targetScale, targetScale, 1) }, { easing: 'sineOut' })
            .start();
    }

    private playHitSnakeLiftEffect(snake: SnakeData | null) {
        if (!snake || snake.escaped || snake.moving) return;

        this.bringSnakeToFront(snake);
        playSnakeHitLiftEffect(snake, (index, total) => this.getSnakePieceScaleByVisualIndex(index, total));
    }

    private flashSnakeColor(snake: SnakeData, flashColor: Color, duration: number) {
        playFlashSnakeColor(snake, flashColor, duration, (callback, delay) => {
            this.scheduleOnce(callback, delay);
        });
    }

    private getSnakePieceFrameByVisualIndex(index: number, total: number, snake?: SnakeData): SpriteFrame | null {
        return getVisualFrame(index, total, snake, {
            head: this.snakeHeadFrame,
            body: this.snakeBodyFrame,
            tailNear: this.snakeTailNearFrame,
            tailEnd: this.snakeTailEndFrame,
            heads: this.snakeHeadFrames,
            bodies: this.snakeBodyFrames,
            tailNears: this.snakeTailNearFrames,
            tailEnds: this.snakeTailEndFrames,
        });
    }

    private getSnakePieceScaleByVisualIndex(index: number, total: number): number {
        return getSnakePieceScaleByVisualIndex(index, total);
    }

    private setSnakePieceBaseScale(node: Node, index: number, total: number) {
        const scale = this.getSnakePieceScaleByVisualIndex(index, total);
        node.setScale(scale, scale, 1);
    }

    private fitSpriteToOriginalAspect(node: Node, sprite: Sprite) {
        const ui = node.getComponent(UITransform);
        const frame = sprite.spriteFrame;

        if (!ui || !frame) return;

        const size = getOriginalAspectSize(frame, this.snakePieceHeight);
        if (!size) return;

        ui.setContentSize(size.width, size.height);
    }

    private attachFaceToSnakeHead(headNode: Node) {
        if (!this.snakeFacePrefab || this.hasSnakeFace(headNode)) return;

        const faceNode = instantiate(this.snakeFacePrefab);
        faceNode.name = 'SnakeFace';
        faceNode.setParent(headNode);
        const faceScale = this.getSnakeFaceScale(headNode);
        faceNode.setPosition(0, -this.snakeFaceEyeCenterY * faceScale, 0);
        faceNode.setScale(faceScale, faceScale, 1);
        faceNode.angle = 0;
        faceNode.setSiblingIndex(headNode.children.length - 1);

        const prefabEye = headNode.getChildByName('eyes');
        if (prefabEye) {
            prefabEye.active = false;
        }

        const oldEye = headNode.getChildByName('HeadEye');
        if (oldEye) {
            oldEye.active = false;
        }

        const face = faceNode.getComponent(SnakeFaceController);
        if (face) {
            face.setupIdleTiming(this.getSnakePieceSeed(headNode));
            face.playIdle();
        }
    }

    private getSnakeFaceScale(headNode: Node): number {
        const headUi = headNode.getComponent(UITransform);
        const headSize = headUi?.contentSize;
        const headWidth = headSize?.width || this.snakePieceHeight;
        const headHeight = headSize?.height || this.snakePieceHeight;
        const eyeLayout = this.snakeHeadEyeFrame
            ? getHeadEyeLayout(this.snakeHeadEyeFrame, headWidth, headHeight)
            : null;

        return eyeLayout ? this.clamp(eyeLayout.height / 168, 0.18, 0.14) : 0.22;
    }

    private getSnakePieceSeed(node: Node): number {
        const piece = node.getComponent(SnakePiece);
        return piece ? piece.snakeId * 37 + piece.pieceIndex : node.getSiblingIndex() + 1;
    }

    private getSnakeFace(snake: SnakeData): SnakeFaceController | null {
        const headNode = snake.nodes[0];
        if (!headNode || !headNode.isValid) return null;

        for (const child of headNode.children) {
            const face = child.getComponent(SnakeFaceController);
            if (face) return face;
        }

        return null;
    }

    private hasSnakeFace(headNode: Node): boolean {
        return headNode.children.some(child => !!child.getComponent(SnakeFaceController));
    }

    private updateHeadEye(headNode: Node, index: number) {
        const prefabEye = headNode.getChildByName('eyes');
        if (prefabEye) {
            prefabEye.active = false;
        }

        const existingEye = headNode.getChildByName('HeadEye');

        if (this.hasSnakeFace(headNode)) {
            if (existingEye) {
                existingEye.active = false;
            }

            return;
        }

        if (index !== 0) {
            if (existingEye) {
                existingEye.active = false;
            }

            return;
        }

        let eyeNode = existingEye;

        if (!eyeNode) {
            eyeNode = new Node('HeadEye');
            eyeNode.setParent(headNode);
            eyeNode.setPosition(0, 0, 0);
            eyeNode.setSiblingIndex(headNode.children.length - 1);
            eyeNode.addComponent(UITransform);
            eyeNode.addComponent(Sprite);
        }

        const eyeUi = eyeNode.getComponent(UITransform);
        const eyeSprite = eyeNode.getComponent(Sprite);

        if (!eyeUi || !eyeSprite || !this.snakeHeadEyeFrame) {
            if (eyeNode) {
                eyeNode.active = false;
            }

            return;
        }

        const headUi = headNode.getComponent(UITransform);
        const headSize = headUi?.contentSize;
        const headWidth = headSize?.width || this.snakePieceHeight;
        const headHeight = headSize?.height || this.snakePieceHeight;
        const eyeLayout = getHeadEyeLayout(this.snakeHeadEyeFrame, headWidth, headHeight);
        if (!eyeLayout) return;

        eyeNode.active = true;
        eyeNode.angle = 0;
        eyeNode.setScale(1, 1, 1);
        eyeNode.setPosition(0, eyeLayout.offsetY, 0);

        eyeSprite.spriteFrame = this.snakeHeadEyeFrame;
        eyeSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        eyeUi.setContentSize(eyeLayout.width, eyeLayout.height);
        eyeSprite.color = Color.WHITE;
    }

    private rotateByDirection(node: Node, dir: GridPos) {
        if (dir.x === 1) {
            node.angle = 90;
        } else if (dir.x === -1) {
            node.angle = -90;
        } else if (dir.y === 1) {
            node.angle = 0;
        } else if (dir.y === -1) {
            node.angle = 180;
        }
    }

    private rotateSnakePiece(node: Node, visual: VisualPoint, index: number, total: number) {
        if (index === 0) {
            this.rotateHeadByDirection(node, visual.dir);
            return;
        }

        if (index >= total - 2) {
            this.rotateTailByDirection(node, getReverseDirection(visual.dir));
            return;
        }

        this.rotateBodyByDirection(node, visual.dir);
    }

    private rotateHeadByDirection(node: Node, dir: GridPos) {
        // snake_head asset is drawn facing down.
        this.rotateByDirection(node, dir);
    }

    private rotateBodyByDirection(node: Node, dir: GridPos) {
        this.rotateByDirection(node, dir);
    }

    private rotateTailByDirection(node: Node, dir: GridPos) {
        // snake_tail1 / snake_tail2 assets are drawn facing up.
        if (dir.x === 1) {
            node.angle = -90;
        } else if (dir.x === -1) {
            node.angle = 90;
        } else if (dir.y === 1) {
            node.angle = 180;
        } else if (dir.y === -1) {
            node.angle = 0;
        }
    }

    private buildSnakeVisualPoints(snake: SnakeData): VisualPoint[] {
        return buildVisualPoints(
            snake.cells,
            snake.direction,
            this.cols,
            this.rows,
            this.cellSize,
            this.piecesPerGridStep,
        );
    }

    private isPointNearSnake(screenX: number, screenY: number, snake: SnakeData): boolean {
        if (!this.snakeRoot) return false;

        const snakeRootUi = this.snakeRoot.getComponent(UITransform);
        if (!snakeRootUi) return false;

        const point = snakeRootUi.convertToNodeSpaceAR(new Vec3(screenX, screenY, 0));
        const segments = buildVisualSegments(snake.cells, this.cols, this.rows, this.cellSize);

        for (const segment of segments) {
            if (getDistanceToSegment(point, segment.start, segment.end) <= this.touchPadding) {
                return true;
            }
        }

        return false;
    }

    private isPointInsideGameArea(screenX: number, screenY: number): boolean {
        if (!this.gameArea || !this.gameArea.isValid) return false;

        const ui = this.gameArea.getComponent(UITransform);
        if (!ui) return false;

        const box = ui.getBoundingBoxToWorld();

        return (
            screenX >= box.x &&
            screenX <= box.x + box.width &&
            screenY >= box.y &&
            screenY <= box.y + box.height
        );
    }

    private clamp(value: number, min: number, max: number): number {
        return Math.min(max, Math.max(min, value));
    }

    private gridToLocal(x: number, y: number): Vec3 {
        return gridToLocalFloat(x, y, this.cols, this.rows, this.cellSize);
    }

    private clearChildren(parent: Node) {
        if (!parent) return;

        for (const child of [...parent.children]) {
            child.destroy();
        }
    }
}
