import { _decorator, Color, Component, Graphics, Node, sp, UITransform } from 'cc';

const { ccclass, property } = _decorator;

type FireworkParticle = {
    kind: 'rocket' | 'spark';
    x: number;
    y: number;
    vx: number;
    vy: number;
    gravity: number;
    drag: number;
    age: number;
    delay: number;
    life: number;
    size: number;
    color: Color;
    trailLength: number;
    exploded?: boolean;
    sparkCount?: number;
    burstSpeed?: number;
};

@ccclass('LevelCompleteEffect')
export class LevelCompleteEffect extends Component {
    @property(sp.Skeleton)
    skeleton: sp.Skeleton | null = null;

    @property
    skinName: string = '1';

    @property
    confettiCount: number = 320;

    private fireworksLayer: Node | null = null;
    private fireworksGraphics: Graphics | null = null;
    private particles: FireworkParticle[] = [];
    private readonly drawColor: Color = new Color();
    private readonly fireworkColors: Color[] = [
        new Color(255, 230, 0, 255),
        new Color(255, 149, 0, 255),
        new Color(244, 64, 52, 255),
        new Color(29, 103, 235, 255),
        new Color(0, 201, 210, 255),
        new Color(65, 222, 139, 255),
    ];

    onLoad() {
        if (!this.skeleton) {
            this.skeleton = this.getComponent(sp.Skeleton);
        }

        if (this.skeleton) {
            this.node.active = false;
        }
    }

    public play() {
        if (!this.skeleton || !this.skeleton.skeletonData) return;

        this.node.active = true;
        this.node.setSiblingIndex(this.node.parent ? this.node.parent.children.length - 1 : 0);

        try {
            this.skeleton.setSkin(this.skinName);
        } catch (e) {
            console.warn('Skin not found:', this.skinName);
        }

        this.skeleton.setSlotsToSetupPose();

        this.skeleton.clearTracks();
        this.skeleton.setAnimation(0, 'appear', false);
        this.skeleton.addAnimation(0, 'loop', true, 0);

        this.playFullscreenFireworks();
    }

    public hide() {
        this.stopFullscreenFireworks();

        if (this.skeleton) {
            this.skeleton.clearTracks();
        }
        this.node.active = false;
    }

    protected update(dt: number) {
        if (!this.fireworksLayer || !this.fireworksGraphics || this.particles.length <= 0) return;

        const ui = this.fireworksLayer.getComponent(UITransform);
        const height = ui?.height || 1280;
        const bottom = -height * 0.5 - 150;
        const graphics = this.fireworksGraphics;

        graphics.clear();

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.age += dt;

            if (particle.age < particle.delay) {
                continue;
            }

            const t = particle.age - particle.delay;
            if (t >= particle.life || particle.y < bottom) {
                this.particles[i] = this.particles[this.particles.length - 1];
                this.particles.pop();

                if (particle.kind === 'rocket' && !particle.exploded) {
                    particle.exploded = true;
                    this.spawnBurst(particle);
                }
                continue;
            }

            particle.vx *= Math.pow(particle.drag, dt * 60);
            particle.vy += particle.gravity * dt;
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;

            if (particle.kind === 'rocket') {
                const progress = t / particle.life;
                const alpha = Math.max(0, 255 * (1 - progress * 0.18));
                this.drawRocket(graphics, particle, alpha);
                if (!particle.exploded && progress >= 0.96) {
                    particle.exploded = true;
                    this.spawnBurst(particle);
                }
                continue;
            }

            const fadeStart = particle.life * 0.52;
            const fadeProgress = t > fadeStart ? (t - fadeStart) / (particle.life - fadeStart) : 0;
            const alpha = Math.max(0, 255 * (1 - fadeProgress));
            this.drawSpark(graphics, particle, alpha);
        }

        if (this.particles.length <= 0) {
            this.stopFullscreenFireworks();
        }
    }

    protected onDestroy() {
        this.stopFullscreenFireworks();
    }

    private playFullscreenFireworks() {
        this.stopFullscreenFireworks();

        const parent = this.node.parent;
        const parentUi = parent?.getComponent(UITransform) || null;
        if (!parent || !parentUi) return;

        const width = parentUi.width;
        const height = parentUi.height;
        const layer = new Node('FullscreenCelebrationFireworks');
        layer.setParent(parent);
        layer.setSiblingIndex(parent.children.length - 1);
        layer.addComponent(UITransform).setContentSize(width, height);
        layer.setPosition(0, 0, 0);

        this.fireworksLayer = layer;
        this.fireworksGraphics = layer.addComponent(Graphics);
        this.particles = [];

        const rocketCount = Math.max(12, Math.min(18, Math.round(this.confettiCount / 24)));
        const startXs = [
            -width * 0.45,
            -width * 0.33,
            -width * 0.2,
            -width * 0.08,
            width * 0.08,
            width * 0.2,
            width * 0.33,
            width * 0.45,
        ];

        for (let i = 0; i < rocketCount; i++) {
            const lane = startXs[i % startXs.length];
            const targetX = (Math.random() - 0.5) * width * 0.86;
            const startX = lane + (Math.random() - 0.5) * width * 0.05;
            const startY = -height * 0.5 - 38 - Math.random() * 34;
            const targetY = height * (0.14 + Math.random() * 0.34);
            const flightTime = 0.92 + Math.random() * 0.42;
            const gravity = -height * (0.78 + Math.random() * 0.18);
            const color = this.fireworkColors[i % this.fireworkColors.length];

            this.particles.push({
                kind: 'rocket',
                x: startX,
                y: startY,
                vx: (targetX - startX) / flightTime,
                vy: (targetY - startY - 0.5 * gravity * flightTime * flightTime) / flightTime,
                gravity,
                drag: 0.995,
                age: 0,
                delay: i * 0.11 + Math.random() * 0.16,
                life: flightTime,
                size: 4 + Math.random() * 2,
                color,
                trailLength: height * (0.055 + Math.random() * 0.03),
                sparkCount: 38 + Math.floor(Math.random() * 18),
                burstSpeed: width * (0.38 + Math.random() * 0.24),
            });
        }
    }

    private spawnBurst(rocket: FireworkParticle) {
        const sparkCount = rocket.sparkCount || 44;
        const burstSpeed = rocket.burstSpeed || 280;
        const baseAngle = Math.random() * Math.PI * 2;

        for (let i = 0; i < sparkCount; i++) {
            const ring = i / sparkCount;
            const angle = baseAngle + ring * Math.PI * 2 + (Math.random() - 0.5) * 0.12;
            const speed = burstSpeed * (0.62 + Math.random() * 0.48);
            const color = this.fireworkColors[(i + Math.floor(ring * this.fireworkColors.length)) % this.fireworkColors.length];

            this.particles.push({
                kind: 'spark',
                x: rocket.x,
                y: rocket.y,
                vx: Math.cos(angle) * speed + rocket.vx * 0.1,
                vy: Math.sin(angle) * speed * 0.92 + Math.max(0, rocket.vy) * 0.06,
                gravity: rocket.gravity * (0.48 + Math.random() * 0.12),
                drag: 0.972 + Math.random() * 0.012,
                age: 0,
                delay: 0,
                life: 2.3 + Math.random() * 0.85,
                size: 3.2 + Math.random() * 4.2,
                color,
                trailLength: 18 + Math.random() * 38,
            });
        }
    }

    private stopFullscreenFireworks() {
        this.particles = [];
        this.fireworksGraphics = null;

        if (this.fireworksLayer?.isValid) {
            this.fireworksLayer.destroy();
        }
        this.fireworksLayer = null;
    }

    private drawRocket(graphics: Graphics, particle: FireworkParticle, alpha: number) {
        const speed = Math.max(1, Math.hypot(particle.vx, particle.vy));
        const tailX = particle.x - particle.vx / speed * particle.trailLength;
        const tailY = particle.y - particle.vy / speed * particle.trailLength;
        const color = particle.color;

        this.drawColor.set(color.r, color.g, color.b, alpha * 0.38);
        graphics.strokeColor = this.drawColor;
        graphics.lineWidth = particle.size * 1.45;
        graphics.moveTo(tailX, tailY);
        graphics.lineTo(particle.x, particle.y);
        graphics.stroke();

        this.drawColor.set(color.r, color.g, color.b, alpha);
        graphics.fillColor = this.drawColor;
        graphics.ellipse(particle.x, particle.y, particle.size, particle.size);
        graphics.fill();
    }

    private drawSpark(graphics: Graphics, particle: FireworkParticle, alpha: number) {
        const color = particle.color;
        const speed = Math.max(1, Math.hypot(particle.vx, particle.vy));
        const tailX = particle.x - particle.vx / speed * particle.trailLength;
        const tailY = particle.y - particle.vy / speed * particle.trailLength;

        this.drawColor.set(color.r, color.g, color.b, alpha * 0.34);
        graphics.strokeColor = this.drawColor;
        graphics.lineWidth = Math.max(1, particle.size * 0.46);
        graphics.moveTo(tailX, tailY);
        graphics.lineTo(particle.x, particle.y);
        graphics.stroke();

        this.drawColor.set(color.r, color.g, color.b, alpha);
        graphics.fillColor = this.drawColor;
        graphics.ellipse(particle.x, particle.y, particle.size, particle.size);
        graphics.fill();
    }
}
