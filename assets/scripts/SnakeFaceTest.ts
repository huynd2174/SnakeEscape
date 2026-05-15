import { _decorator, Component, sp } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('SnakeFaceTest')
export class SnakeFaceTest extends Component {
    @property(sp.Skeleton)
    skeleton: sp.Skeleton | null = null;

    start() {
        if (!this.skeleton) {
            this.skeleton = this.getComponent(sp.Skeleton);
        }

        if (!this.skeleton) {
            console.error('SnakeFaceTest: Không tìm thấy sp.Skeleton');
            return;
        }

        if (!this.skeleton.skeletonData) {
            console.error('SnakeFaceTest: Chưa gán SkeletonData');
            return;
        }

        // Ép chạy animation idle bằng code
        this.skeleton.setAnimation(0, 'idle', true);
    }
}