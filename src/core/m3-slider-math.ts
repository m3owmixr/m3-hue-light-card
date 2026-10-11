/**
 * Pure helpers for the M3 slider (value <-> position, keyboard steps).
 */
export class M3SliderMath {
    /** Keyboard step in value units (arrow keys). */
    public static readonly KeyStep = 5;
    /** Keyboard step with Shift held. */
    public static readonly KeyStepFine = 1;

    public static clamp(value: number, min: number, max: number): number {
        return Math.min(max, Math.max(min, value));
    }

    /** Rounds value to the nearest step (counted from min) and clamps it to range. */
    public static snap(value: number, min: number, max: number, step: number): number {
        const snapped = step > 0
            ? Math.round((value - min) / step) * step + min
            : value;
        return M3SliderMath.clamp(snapped, min, max);
    }

    /** Position of value in range as 0..1. */
    public static fraction(value: number, min: number, max: number): number {
        if (max <= min)
            return 0;
        return M3SliderMath.clamp((value - min) / (max - min), 0, 1);
    }

    /**
     * Converts pointer x (client coordinates) to value.
     * The handle center can travel from handleWidth/2 to width - handleWidth/2.
     */
    public static valueFromPosition(x: number, trackLeft: number, trackWidth: number, handleWidth: number, min: number, max: number, step: number): number {
        const usable = trackWidth - handleWidth;
        const f = usable > 0
            ? M3SliderMath.clamp((x - trackLeft - handleWidth / 2) / usable, 0, 1)
            : 0;
        return M3SliderMath.snap(min + f * (max - min), min, max, step);
    }

    /**
     * Returns new value for keyboard key, or null when the key is not handled.
     */
    public static keyValue(key: string, shift: boolean, value: number, min: number, max: number): number | null {
        const step = shift ? M3SliderMath.KeyStepFine : M3SliderMath.KeyStep;
        switch (key) {
            case 'ArrowRight':
            case 'ArrowUp':
                return M3SliderMath.clamp(value + step, min, max);
            case 'ArrowLeft':
            case 'ArrowDown':
                return M3SliderMath.clamp(value - step, min, max);
            case 'Home':
                return min;
            case 'End':
                return max;
            default:
                return null;
        }
    }
}

/**
 * Calls the callback immediately, then at most once per interval with the latest value.
 */
export class Throttler<T> {
    private readonly _callback: (value: T) => void;
    private readonly _interval: number;
    private _timer: ReturnType<typeof setTimeout> | null = null;
    private _hasPending = false;
    private _pending: T | undefined;

    public constructor(callback: (value: T) => void, interval: number) {
        this._callback = callback;
        this._interval = interval;
    }

    public call(value: T): void {
        if (this._timer) {
            this._pending = value;
            this._hasPending = true;
            return;
        }

        this._callback(value);
        this.startTimer();
    }

    /** Drops any pending call and resets the interval. */
    public cancel(): void {
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
        this._hasPending = false;
        this._pending = undefined;
    }

    private startTimer(): void {
        this._timer = setTimeout(() => {
            this._timer = null;
            if (this._hasPending) {
                const value = this._pending as T;
                this._hasPending = false;
                this._pending = undefined;
                this._callback(value);
                this.startTimer();
            }
        }, this._interval);
    }
}
