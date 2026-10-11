import { LitElement, css, html } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { M3SliderMath, Throttler } from '../core/m3-slider-math';
import { Consts } from '../types/consts';

/*
 * Flat slider following the M3 Expressive spec (XS size): 16px track, 4x44px handle,
 * 6px handle-track gaps and a stop indicator at the end of the inactive track.
 * See doc/m3-design-spec.md (decision A).
 *
 * Events:
 * - value-changing: { value } while dragging, throttled (~200ms)
 * - change: { value } when the user finishes (pointer up / key press)
 *
 * Colors can be overridden from outside:
 * --m3-slider-active-color, --m3-slider-inactive-color, --m3-slider-handle-color, --m3-slider-stop-color
 */

@customElement(M3Slider.ElementName)
export class M3Slider extends LitElement {
    /**
     * Name of this Element
     */
    public static readonly ElementName = 'm3-slider' + Consts.ElementPostfix;

    // Consts
    private static readonly HandleWidth = 4;
    private static readonly Gap = 6;
    private static readonly ThrottleMs = 200;

    @property({ type: Boolean, reflect: true })
    public disabled: boolean = false;

    @property({ type: Number })
    public value: number = 0;

    @property({ type: Number })
    public step: number = 1;

    @property({ type: Number })
    public min: number = 0;

    @property({ type: Number })
    public max: number = 100;

    /** Value shown while the user drags; external value updates are ignored meanwhile. */
    @state()
    private _dragValue: number | null = null;

    @query('.track')
    private _track!: HTMLElement;

    private _trackRect: DOMRect | null = null;
    private _lastSent: number | null = null;
    private readonly _throttle = new Throttler<number>(v => this.sendChanging(v), M3Slider.ThrottleMs);

    private get currentValue(): number {
        return this._dragValue ?? M3SliderMath.clamp(this.value ?? this.min, this.min, this.max);
    }

    public override disconnectedCallback(): void {
        super.disconnectedCallback();
        this._throttle.cancel();
        this._dragValue = null;
    }

    private valueFromEvent(ev: PointerEvent): number {
        const rect = this._trackRect ?? this._track.getBoundingClientRect();
        return M3SliderMath.valueFromPosition(ev.clientX, rect.left, rect.width, M3Slider.HandleWidth, this.min, this.max, this.step);
    }

    private onPointerDown(ev: PointerEvent): void {
        if (this.disabled || ev.button !== 0)
            return;

        ev.preventDefault();
        this._track.setPointerCapture(ev.pointerId);
        this._track.focus({ preventScroll: true });
        this._trackRect = this._track.getBoundingClientRect();
        this._lastSent = null;
        this._dragValue = this.valueFromEvent(ev);
        this._throttle.call(this._dragValue);
    }

    private onPointerMove(ev: PointerEvent): void {
        if (this._dragValue == null)
            return;

        const value = this.valueFromEvent(ev);
        if (value != this._dragValue) {
            this._dragValue = value;
            this._throttle.call(value);
        }
    }

    private onPointerUp(ev: PointerEvent): void {
        if (this._dragValue == null)
            return;

        if (this._track.hasPointerCapture(ev.pointerId)) {
            this._track.releasePointerCapture(ev.pointerId);
        }

        const value = ev.type == 'pointercancel' ? this._dragValue : this.valueFromEvent(ev);
        this._throttle.cancel();
        this._trackRect = null;
        this._dragValue = null;
        this.commit(value);
    }

    private onKeyDown(ev: KeyboardEvent): void {
        if (this.disabled)
            return;

        const value = M3SliderMath.keyValue(ev.key, ev.shiftKey, this.currentValue, this.min, this.max);
        if (value == null)
            return;

        ev.preventDefault();
        this._lastSent = null;
        this.commit(M3SliderMath.snap(value, this.min, this.max, this.step));
    }

    private sendChanging(value: number): void {
        this._lastSent = value;
        this.dispatchEvent(new CustomEvent('value-changing', { detail: { value } }));
    }

    private commit(value: number): void {
        this.value = value;
        // the last throttled update already sent this value
        if (this._lastSent === value)
            return;

        this.dispatchEvent(new CustomEvent('change', { detail: { value } }));
    }

    protected override render() {
        const value = this.currentValue;
        const f = M3SliderMath.fraction(value, this.min, this.max);
        const dragging = this._dragValue != null;

        return html`
            <div
                class=${classMap({ track: true, dragging })}
                style=${styleMap({ '--_f': f.toString() })}
                role="slider"
                tabindex=${this.disabled ? -1 : 0}
                aria-valuemin=${this.min}
                aria-valuemax=${this.max}
                aria-valuenow=${value}
                aria-disabled=${this.disabled ? 'true' : 'false'}
                @pointerdown=${this.onPointerDown}
                @pointermove=${this.onPointerMove}
                @pointerup=${this.onPointerUp}
                @pointercancel=${this.onPointerUp}
                @keydown=${this.onKeyDown}
            >
                <div class="active"></div>
                <div class="inactive"><div class="stop"></div></div>
                <div class="handle"></div>
            </div>
        `;
    }

    public static override get styles() {
        const hw = M3Slider.HandleWidth;
        const gap = M3Slider.Gap;

        return css`
            :host {
                display: block;

                --m3-slider-active-color: var(--md-sys-color-primary, var(--primary-color));
                --m3-slider-inactive-color: var(--md-sys-color-surface-container-highest, var(--secondary-background-color, rgba(127, 127, 127, 0.3)));
                --m3-slider-handle-color: var(--m3-slider-active-color);
                --m3-slider-stop-color: var(--m3-slider-active-color);
            }
            :host([disabled]) {
                --_on-surface: var(--md-sys-color-on-surface, var(--primary-text-color));
                --m3-slider-active-color: color-mix(in srgb, var(--_on-surface) 38%, transparent);
                --m3-slider-inactive-color: color-mix(in srgb, var(--_on-surface) 12%, transparent);
            }
            .track {
                position: relative;
                height: 48px;
                touch-action: none;
                cursor: pointer;
                outline: none;
                -webkit-tap-highlight-color: transparent;
            }
            :host([disabled]) .track {
                cursor: default;
            }
            .active,
            .inactive,
            .handle {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                transition: width 150ms ease-out, left 150ms ease-out, background-color 300ms ease-out;
            }
            .dragging .active,
            .dragging .inactive,
            .dragging .handle {
                transition: background-color 300ms ease-out;
            }
            .active {
                left: 0;
                width: max(0px, calc(var(--_f) * (100% - ${hw}px) - ${gap}px));
                height: 16px;
                border-radius: 8px 2px 2px 8px;
                background: var(--m3-slider-active-color);
            }
            .inactive {
                right: 0;
                width: max(0px, calc((1 - var(--_f)) * (100% - ${hw}px) - ${gap}px));
                height: 16px;
                border-radius: 2px 8px 8px 2px;
                background: var(--m3-slider-inactive-color);
                overflow: hidden;
            }
            .stop {
                position: absolute;
                right: 6px;
                top: 6px;
                width: 4px;
                height: 4px;
                border-radius: 2px;
                background: var(--m3-slider-stop-color);
            }
            .handle {
                left: calc(var(--_f) * (100% - ${hw}px));
                width: ${hw}px;
                height: 44px;
                border-radius: 2px;
                background: var(--m3-slider-handle-color);
            }
            .dragging .handle {
                /* narrows to 2px while dragging, kept centered */
                width: 2px;
                margin-left: 1px;
                transition: width 100ms ease-out, margin-left 100ms ease-out, background-color 300ms ease-out;
            }
            .track:focus-visible .handle {
                outline: 2px solid var(--m3-slider-handle-color);
                outline-offset: 2px;
            }
            @media (prefers-reduced-motion: reduce) {
                .active,
                .inactive,
                .handle {
                    transition: none !important;
                }
            }
        `;
    }
}
