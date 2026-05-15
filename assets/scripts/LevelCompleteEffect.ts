import { _decorator, Component, sp } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('LevelCompleteEffect')
export class LevelCompleteEffect extends Component {
    @property(sp.Skeleton)
    skeleton: sp.Skeleton | null = null;

    @property
    skinName: string = '1';

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
    }

    public hide() {
        if (!this.skeleton) return;

        this.skeleton.clearTracks();
        this.node.active = false;
    }
}
