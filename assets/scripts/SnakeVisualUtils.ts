import { Size, SpriteFrame } from 'cc';
import { SnakeData, SnakeSkin } from './SnakeTypes';

export type SnakeFramePalette = {
    head: SpriteFrame | null;
    body: SpriteFrame | null;
    tailNear: SpriteFrame | null;
    tailEnd: SpriteFrame | null;
    heads: SpriteFrame[];
    bodies: SpriteFrame[];
    tailNears: SpriteFrame[];
    tailEnds: SpriteFrame[];
};

export type EyeLayout = {
    width: number;
    height: number;
    offsetY: number;
};

export function getSnakePieceFrameByVisualIndex(
    index: number,
    total: number,
    snake: SnakeData | undefined,
    frames: SnakeFramePalette,
): SpriteFrame | null {
    const paletteIndex = snake ? getSnakePaletteIndex(snake.skin) : -1;

    if (index === 0) {
        return frames.heads[paletteIndex] || frames.head;
    }

    if (index === total - 1) {
        return frames.tailEnds[paletteIndex] || frames.tailEnd;
    }

    if (index === total - 2) {
        return frames.tailNears[paletteIndex] || frames.tailNear;
    }

    return frames.bodies[paletteIndex] || frames.body;
}

function getSnakePaletteIndex(skin: SnakeSkin): number {
    switch (skin) {
        case 'green':
            return 1;
        case 'pink':
            return 2;
        case 'red':
            return 3;
        case 'violet':
            return 4;
        case 'yellow':
            return 5;
        case 'blue':
        default:
            return 0;
    }
}

export function getSnakePieceScaleByVisualIndex(index: number, total: number): number {
    if (total <= 1) {
        return 0.90;
    }

    const progress = index / (total - 1);

    if (index === 0) {
        return 0.88;
    }

    if (index === total - 1) {
        return 0.50;
    }

    if (index === total - 2) {
        return 0.67;
    }

    // Body pieces gradually get smaller from head to tail to create depth
    // without making the corner pieces look abruptly inflated.
    return 0.75 - progress * 0.05;
}

export function getOriginalAspectSize(frame: SpriteFrame | null, targetHeight: number): Size | null {
    if (!frame) return null;

    const originalSize = frame.originalSize;
    const width = originalSize.width || targetHeight;
    const height = originalSize.height || targetHeight;
    const aspect = width / height;

    return new Size(targetHeight * aspect, targetHeight);
}

export function getHeadEyeLayout(
    eyeFrame: SpriteFrame | null,
    headWidth: number,
    headHeight: number,
): EyeLayout | null {
    if (!eyeFrame) return null;

    const eyeRect = eyeFrame.rect;
    const eyeAspect = eyeRect.width / eyeRect.height;
    const width = headWidth * 0.86;

    return {
        width,
        height: width / eyeAspect,
        offsetY: headHeight * 0.12,
    };
}
