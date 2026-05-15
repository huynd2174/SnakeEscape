import { _decorator, AudioClip, AudioSource, Component } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('SoundManager')
export class SoundManager extends Component {
    @property(AudioSource)
    audioSource: AudioSource | null = null;

    @property(AudioClip)
    seClick: AudioClip | null = null;

    @property(AudioClip)
    seRevivePopup: AudioClip | null = null;

    @property(AudioClip)
    seLosePopup: AudioClip | null = null;

    @property(AudioClip)
    seWinPopup: AudioClip | null = null;

    @property(AudioClip)
    heartSwish: AudioClip | null = null;

    @property(AudioClip)
    seSnakeMove: AudioClip | null = null;

    @property(AudioClip)
    seSnakeTap: AudioClip | null = null;

    @property(AudioClip)
    sfxConfettiExplosion: AudioClip | null = null;

    @property(AudioClip)
    tickTock: AudioClip | null = null;

    @property(AudioClip)
    timeout: AudioClip | null = null;

    @property
    sfxVolume: number = 1;

    @property
    moveVolume: number = 0.35;

    private lastMoveSoundTime: number = 0;
    private readonly moveSoundCooldownMs: number = 90;

    onLoad() {
        if (!this.audioSource) {
            this.audioSource = this.getComponent(AudioSource);
        }
    }

    public playClick() {
        this.playOneShot(this.seClick, 0.8);
    }

    public playRevivePopup() {
        this.playOneShot(this.seRevivePopup, 0.9);
    }

    public playLosePopup() {
        this.playOneShot(this.seLosePopup, 1);
    }

    public playWinPopup() {
        this.playOneShot(this.seWinPopup, 1);
    }

    public playHeartSwish() {
        this.playOneShot(this.heartSwish, 0.75);
    }

    public playSnakeTap() {
        this.playOneShot(this.seSnakeTap, 0.9);
    }

    public playSnakeMove() {
        const now = Date.now();

        if (now - this.lastMoveSoundTime < this.moveSoundCooldownMs) {
            return;
        }

        this.lastMoveSoundTime = now;
        this.playOneShot(this.seSnakeMove, this.moveVolume);
    }

    public playConfettiExplosion() {
        this.playOneShot(this.sfxConfettiExplosion, 1);
    }

    public playTickTock() {
        this.playOneShot(this.tickTock, 0.55);
    }

    public playTimeout() {
        this.playOneShot(this.timeout, 1);
    }

    private playOneShot(clip: AudioClip | null, volumeScale: number) {
        if (!this.audioSource || !clip) return;

        this.audioSource.playOneShot(clip, this.sfxVolume * volumeScale);
    }
}
