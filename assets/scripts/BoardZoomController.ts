import { _decorator, Component, Node, Slider, Label, math, EventTouch, input, Input, tween, Tween, Vec3, UIOpacity } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('BoardZoomController')
export class BoardZoomController extends Component {
    // SnakeEscapeGame reads this to avoid tapping snakes while zooming
    public static isGestureZooming: boolean = false;

    @property(Node)
    zoomTarget: Node | null = null;

    @property(Node)
    zoomControls: Node | null = null;

    @property(Slider)
    zoomSlider: Slider | null = null;

    @property(Label)
    percentLabel: Label | null = null;

    @property
    normalScale: number = 1.0;

    @property
    maxScale: number = 1.8;

    @property
    defaultProgress: number = 0;

    @property
    pinchSensitivity: number = 300;

    private currentProgress: number = 0;
    private isPinching: boolean = false;

    private pinchStartDistance: number = 0;
    private pinchStartProgress: number = 0;

    onLoad() {
        this.currentProgress = math.clamp01(this.defaultProgress);

        // Initialize UI without triggering applyZoom's instant scale
        if (this.zoomSlider) this.zoomSlider.progress = this.currentProgress;
        this.ensurePercentLabelActive();
        if (this.percentLabel) this.percentLabel.string = `${Math.round(this.currentProgress * 100)}%`;

        // Set starting state for premium entrance animation
        if (this.zoomTarget) {
            let uiOpacity = this.zoomTarget.getComponent(UIOpacity);
            if (!uiOpacity) uiOpacity = this.zoomTarget.addComponent(UIOpacity);

            // Ẩn hoàn toàn và bắt đầu từ kích thước 30%
            uiOpacity.opacity = 0;
            this.zoomTarget.setScale(new Vec3(0.1, 0.1, 1));
        }

        if (this.zoomControls) {
            this.zoomControls.active = false;
        }

        // Use global input — does NOT swallow single-finger touches
        input.on(Input.EventType.TOUCH_START, this.onGlobalTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onGlobalTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.onGlobalTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onGlobalTouchEnd, this);
    }

    start() {
        // Dynamic & Fast Entrance animation
        if (this.zoomTarget) {
            const targetScaleVal = math.lerp(this.normalScale, this.maxScale, this.currentProgress);
            const targetScale = new Vec3(targetScaleVal, targetScaleVal, 1);

            const uiOpacity = this.zoomTarget.getComponent(UIOpacity);
            if (uiOpacity) {
                Tween.stopAllByTarget(uiOpacity);
                tween(uiOpacity)
                    // Hiện rõ rất nhanh trong 0.4s
                    .to(0.4, { opacity: 255 }, { easing: 'sineOut' })
                    .start();
            }

            Tween.stopAllByTarget(this.zoomTarget);
            tween(this.zoomTarget)
                // Phóng to chậm hơn một chút theo yêu cầu, nảy mượt mà (backOut) trong 0.85s
                .to(0.85, { scale: targetScale }, { 
                    easing: 'backOut',
                    onUpdate: (target: object, ratio: number) => {
                        const node = target as Node;
                        // Tính toán lại % zoom từ scale thực tế (bắt được khoảnh khắc scale bị lố)
                        const currentScale = node.scale.x;
                        const rawProgress = (currentScale - this.normalScale) / (this.maxScale - this.normalScale);

                        if (this.percentLabel) {
                            // Không hiển thị số âm khi đang phóng từ 0.1 lên 100%
                            let pct = Math.round(rawProgress * 100);
                            if (pct < 0) pct = 0;
                            this.percentLabel.string = `${pct}%`;
                        }

                        if (this.zoomSlider) {
                            // Cập nhật cả thanh trượt để nó nảy theo
                            this.zoomSlider.progress = math.clamp01(rawProgress);
                        }
                    }
                })
                .start();
        }
    }

    onDestroy() {
        input.off(Input.EventType.TOUCH_START, this.onGlobalTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onGlobalTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this.onGlobalTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.onGlobalTouchEnd, this);
    }

    public onSliderChanged(slider: Slider) {
        this.setProgress(slider.progress);
    }

    public onClickToggleZoom() {
        if (this.zoomControls) {
            this.zoomControls.active = !this.zoomControls.active;
        }

        this.ensurePercentLabelActive();
    }

    public resetZoom() {
        this.setProgress(0);
    }

    private onGlobalTouchStart(event: EventTouch) {
        const touches = event.getAllTouches();

        if (touches.length >= 2 && !this.isPinching) {
            this.startPinch(event);
        }
    }

    private onGlobalTouchMove(event: EventTouch) {
        const touches = event.getAllTouches();

        if (touches.length < 2) return;

        if (!this.isPinching) {
            this.startPinch(event);
            return;
        }

        BoardZoomController.isGestureZooming = true;

        const currentDistance = this.getTouchDistance(event);
        const deltaDistance = currentDistance - this.pinchStartDistance;

        const deltaProgress = deltaDistance / this.pinchSensitivity;
        const newProgress = this.pinchStartProgress + deltaProgress;

        this.setProgress(newProgress);
    }

    private onGlobalTouchEnd(event: EventTouch) {
        if (!this.isPinching) return;

        const touches = event.getAllTouches();

        // When only 1 or 0 touches remain, pinch is done
        if (touches.length < 2) {
            this.isPinching = false;

            // Release the flag after a short delay so the
            // final TOUCH_END from lifting fingers doesn't tap a snake
            this.unscheduleAllCallbacks();
            this.scheduleOnce(() => {
                BoardZoomController.isGestureZooming = false;
            }, 0.15);
        }
    }

    private startPinch(event: EventTouch) {
        this.isPinching = true;
        BoardZoomController.isGestureZooming = true;

        this.pinchStartDistance = this.getTouchDistance(event);
        this.pinchStartProgress = this.currentProgress;
    }

    private getTouchDistance(event: EventTouch): number {
        const touches = event.getAllTouches();

        if (touches.length < 2) return 0;

        const p1 = touches[0].getUILocation();
        const p2 = touches[1].getUILocation();

        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;

        return Math.sqrt(dx * dx + dy * dy);
    }

    private setProgress(progress: number) {
        this.currentProgress = math.clamp01(progress);

        if (this.zoomSlider) {
            this.zoomSlider.progress = this.currentProgress;
        }

        this.applyZoom(this.currentProgress);
    }

    private applyZoom(progress: number) {
        progress = math.clamp01(progress);

        const scale = math.lerp(this.normalScale, this.maxScale, progress);

        if (this.zoomTarget) {
            this.zoomTarget.setScale(scale, scale, 1);
        }

        if (this.percentLabel) {
            this.ensurePercentLabelActive();
            this.percentLabel.string = `${Math.round(progress * 100)}%`;
        }
    }

    private ensurePercentLabelActive() {
        if (!this.percentLabel) return;

        this.percentLabel.node.active = true;
    }
}
