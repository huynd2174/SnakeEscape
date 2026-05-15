import { Color, Node, Sprite, SpriteFrame, Tween, tween, UIOpacity, UITransform, Vec3 } from 'cc';
import { SnakeData } from './SnakeTypes';

export function playHeartLostEffect(
    heart: Node,
    sprite: Sprite,
    fullFrame: SpriteFrame | null,
    emptyFrame: SpriteFrame | null,
) {
    if (fullFrame) {
        sprite.spriteFrame = fullFrame;
    }

    heart.active = true;
    heart.setScale(1, 1, 1);
    heart.angle = 0;

    Tween.stopAllByTarget(heart);

    tween(heart)
        .to(0.07, {
            scale: new Vec3(1.28, 1.28, 1),
            angle: -8,
        })
        .to(0.08, {
            scale: new Vec3(0.72, 0.72, 1),
            angle: 8,
        })
        .call(() => {
            if (emptyFrame) {
                sprite.spriteFrame = emptyFrame;
            }
        })
        .to(0.10, {
            scale: new Vec3(1, 1, 1),
            angle: 0,
        })
        .start();
}

export function playNodePop(node: Node, scale = 1.25) {
    node.setScale(1, 1, 1);

    tween(node)
        .to(0.08, { scale: new Vec3(scale, scale, 1) })
        .to(0.10, { scale: new Vec3(1, 1, 1) })
        .start();
}

export function playSnakeTapEffect(
    snake: SnakeData,
    getBaseScale: (index: number, total: number) => number,
) {
    const total = snake.nodes.length;

    for (let i = 0; i < snake.nodes.length; i++) {
        const node = snake.nodes[i];
        if (!node || !node.isValid) continue;

        const baseScale = getBaseScale(i, total);

        node.setScale(baseScale, baseScale, 1);

        tween(node)
            .to(0.05, { scale: new Vec3(baseScale * 1.12, baseScale * 1.12, 1) })
            .to(0.06, { scale: new Vec3(baseScale, baseScale, 1) })
            .start();
    }
}

export function playSnakeBlockedShake(snake: SnakeData) {
    const dir = snake.direction;
    const shakeOffset = new Vec3(
        dir.x * 8,
        -dir.y * 8,
        0
    );

    for (const node of snake.nodes) {
        if (!node || !node.isValid) continue;

        const original = node.position.clone();

        tween(node)
            .to(0.04, { position: original.clone().add(shakeOffset) })
            .to(0.04, { position: original.clone().subtract(shakeOffset) })
            .to(0.04, { position: original })
            .start();
    }
}

export function playSnakeHitLiftEffect(
    snake: SnakeData,
    getBaseScale: (index: number, total: number) => number,
) {
    if (snake.moving) return;

    const total = snake.nodes.length;

    for (let i = 0; i < snake.nodes.length; i++) {
        const node = snake.nodes[i];
        if (!node || !node.isValid) continue;

        const baseScale = getBaseScale(i, total);
        const popScale = baseScale * 1.36;
        const settleScale = baseScale * 0.94;
        const delay = Math.min(i * 0.006, 0.04);

        Tween.stopAllByTarget(node);
        node.setScale(baseScale, baseScale, 1);

        tween(node)
            .delay(delay)
            .to(0.07, { scale: new Vec3(popScale, popScale, 1) }, { easing: 'backOut' })
            .to(0.08, { scale: new Vec3(settleScale, settleScale, 1) }, { easing: 'sineInOut' })
            .to(0.07, { scale: new Vec3(baseScale, baseScale, 1) }, { easing: 'sineOut' })
            .start();
    }
}

export function flashSnakeColor(
    snake: SnakeData,
    flashColor: Color,
    duration: number,
    scheduleOnce: (callback: () => void, delay: number) => void,
) {
    for (const node of snake.nodes) {
        if (!node || !node.isValid) continue;

        const sprite = node.getComponent(Sprite);
        if (!sprite) continue;

        sprite.color = flashColor;
    }

    scheduleOnce(() => {
        for (const node of snake.nodes) {
            if (!node || !node.isValid) continue;

            const sprite = node.getComponent(Sprite);
            if (!sprite) continue;

            sprite.color = Color.WHITE;
        }
    }, duration);
}

export function prepareRedAuraOverlay(aura: Node | null) {
    if (!aura || !aura.isValid) return;

    const opacity = aura.getComponent(UIOpacity) || aura.addComponent(UIOpacity);
    opacity.opacity = 0;
    aura.active = false;
}

export function playRedAuraOverlay(aura: Node | null, canvasNode: Node) {
    if (!aura || !aura.isValid) return;

    const canvasUi = canvasNode.getComponent(UITransform);
    const auraUi = aura.getComponent(UITransform);
    const opacity = aura.getComponent(UIOpacity) || aura.addComponent(UIOpacity);

    if (canvasUi && auraUi) {
        auraUi.setContentSize(canvasUi.contentSize);
    }

    Tween.stopAllByTarget(aura);
    Tween.stopAllByTarget(opacity);

    aura.active = true;
    aura.setPosition(0, 0, 0);
    aura.setScale(1, 1, 1);
    aura.setSiblingIndex(aura.parent ? aura.parent.children.length - 1 : 0);
    opacity.opacity = 0;

    tween(opacity)
        .to(0.06, { opacity: 255 })
        .to(0.22, { opacity: 0 })
        .call(() => {
            if (aura && aura.isValid) {
                aura.active = false;
            }
        })
        .start();
}
