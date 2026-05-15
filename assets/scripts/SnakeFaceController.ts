import { _decorator, Component, sp } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('SnakeFaceController')
export class SnakeFaceController extends Component {
    @property(sp.Skeleton)
    skeleton: sp.Skeleton | null = null;

    private idleSeed: number = 0;
    private idleTimeScale: number = 1;

    onLoad() {
        if (!this.skeleton) {
            this.skeleton = this.getComponent(sp.Skeleton);
        }

        this.playIdle();
    }

    public setupIdleTiming(seed: number) {
        this.idleSeed = Math.max(0, seed);
        this.idleTimeScale = 0.92 + (this.getSeededRatio(seed + 17) * 0.18);
        this.applyTimeScale();
    }

    public playIdle() {
        this.playLoop('idle', this.getSeededRatio(this.idleSeed + 31) * 1.8);
    }

    public playHappy() {
        this.playOnceThenIdle('happy');
    }

    public playAngry() {
        this.playOnceThenIdle('angry');
    }

    public playDizzy() {
        this.playOnceThenIdle('dizzy');
    }

    public playTongue() {
        this.playOnceThenIdle('tongue');
    }

    private playLoop(animationName: string, startOffset: number = 0) {
        if (!this.skeleton || !this.hasAnimation(animationName)) return;

        this.applyTimeScale();
        const entry = this.skeleton.setAnimation(0, animationName, true) as unknown as {
            trackTime?: number;
            animationEnd?: number;
        };

        if (entry && startOffset > 0) {
            const duration = typeof entry.animationEnd === 'number' && entry.animationEnd > 0
                ? entry.animationEnd
                : startOffset;
            entry.trackTime = startOffset % duration;
        }
    }

    private playOnceThenIdle(animationName: string) {
        if (!this.skeleton || !this.hasAnimation(animationName)) return;

        this.applyTimeScale();
        this.skeleton.setAnimation(0, animationName, false);

        if (this.hasAnimation('idle')) {
            this.skeleton.addAnimation(0, 'idle', true, 0);
        }
    }

    private applyTimeScale() {
        if (!this.skeleton) return;

        this.skeleton.timeScale = this.idleTimeScale;
    }

    private getSeededRatio(seed: number): number {
        const value = Math.sin(seed * 12.9898) * 43758.5453;
        return value - Math.floor(value);
    }

    private hasAnimation(animationName: string): boolean {
        const skeletonData = this.skeleton?.skeletonData;
        const animations = skeletonData?.getAnimsEnum?.();
        if (!animations) return true;

        return Object.prototype.hasOwnProperty.call(animations, animationName);
    }
}
