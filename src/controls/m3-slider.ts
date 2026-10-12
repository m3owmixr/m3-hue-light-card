import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { M3SliderMath, Throttler } from '../core/m3-slider-math';
import { Consts } from '../types/consts';

/*
 * Slider following the M3 Expressive spec. See doc/m3-design-spec.md (decision A).
 * - flat (default, XS size): 16px track, 4x44px handle, 6px handle-track gaps and a stop indicator
 *   at the end of the inactive track.
 * - wavy (as in m3-light-card): 6px active track drawn as a moving sine wave, 6px straight inactive
 *   track, 6x34px handle, no stop indicator. The wave stands still when disabled or with reduced motion.
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
    private static readonly WavyHandleWidth = 6;
    private static readonly Gap = 6;
    private static readonly ThrottleMs = 200;
    private static readonly WavyHeight = 56;
    private static readonly WaveStroke = 6;
    private static readonly WaveAmplitude = 3.5;
    private static readonly WaveLength = 24;
    /** One wavelength per this many ms. */
    private static readonly WavePeriodMs = 1000;

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

    @property({ reflect: true })
    public variant: 'flat' | 'wavy' = 'flat';

    /** Value shown while the user drags; external value updates are ignored meanwhile. */
    @state()
    private _dragValue: number | null = null;

    @query('.track')
    private _track!: HTMLElement;

    @query('.wave path')
    private _wavePath!: SVGPathElement | null;

    private _trackRect: DOMRect | null = null;
    private _lastSent: number | null = null;
    private readonly _throttle = new Throttler<number>(v => this.sendChanging(v), M3Slider.ThrottleMs);

    private _trackWidth = 0;
    private _resizeObserver: ResizeObserver | null = null;
    private _frame: number | null = null;
    private _phase = 0;

    private get currentValue(): number {
        return this._dragValue ?? M3SliderMath.clamp(this.value ?? this.min, this.min, this.max);
    }

    private get isWavy(): boolean {
        return this.variant == 'wavy';
    }

    private get handleWidth(): number {
        return this.isWavy ? M3Slider.WavyHandleWidth : M3Slider.HandleWidth;
    }

    public override connectedCallback(): void {
        super.connectedCallback();
        // reconnected after a previous render
        if (this.hasUpdated) {
            this.syncWave();
        }
    }

    public override disconnectedCallback(): void {
        super.disconnectedCallback();
        this._throttle.cancel();
        this._dragValue = null;
        this.stopWave();
        this._resizeObserver?.disconnect();
        this._resizeObserver = null;
    }

    protected override updated(): void {
        this.syncWave();
    }

    /** Starts/stops the wave animation (or draws it once) to match the current state. */
    private syncWave(): void {
        if (!this.isWavy) {
            this.stopWave();
            return;
        }

        if (!this._resizeObserver && typeof ResizeObserver != 'undefined') {
            this._resizeObserver = new ResizeObserver(entries => {
                this._trackWidth = entries[0].contentRect.width;
                this.drawWave();
            });
            this._resizeObserver.observe(this._track);
        }

        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        if (this.disabled || reducedMotion) {
            this.stopWave();
            this.drawWave();
        }
        else if (this._frame == null) {
            this._frame = requestAnimationFrame(t => this.waveFrame(t));
        }
        else {
            // already animating: the next frame picks up the new value
        }
    }

    private stopWave(): void {
        if (this._frame != null) {
            cancelAnimationFrame(this._frame);
            this._frame = null;
        }
    }

    private waveFrame(time: number): void {
        this._phase = (time % M3Slider.WavePeriodMs) / M3Slider.WavePeriodMs * 2 * Math.PI;
        this.drawWave();
        this._frame = requestAnimationFrame(t => this.waveFrame(t));
    }

    private drawWave(): void {
        if (!this._wavePath)
            return;

        // round caps reach half a stroke past each end of the path
        const cap = M3Slider.WaveStroke / 2;
        const f = M3SliderMath.fraction(this.currentValue, this.min, this.max);
        const end = M3SliderMath.activeTrackEnd(f, this._trackWidth, this.handleWidth, M3Slider.Gap);
        const d = M3SliderMath.wavePath(cap, end - cap, M3Slider.WavyHeight / 2, M3Slider.WaveAmplitude, M3Slider.WaveLength, this._phase);
        this._wavePath.setAttribute('d', d);
    }

    private valueFromEvent(ev: PointerEvent): number {
        const rect = this._trackRect ?? this._track.getBoundingClientRect();
        return M3SliderMath.valueFromPosition(ev.clientX, rect.left, rect.width, this.handleWidth, this.min, this.max, this.step);
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
        // the wave path is drawn by drawWave(), outside of Lit rendering
        const active = this.isWavy
            ? html`<svg class="wave" aria-hidden="true"><path></path></svg>`
            : html`<div class="active"></div>`;
        const stop = this.isWavy ? nothing : html`<div class="stop"></div>`;

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
                ${active}
                <div class="inactive">${stop}</div>
                <div class="handle"></div>
            </div>
        `;
    }

    public static override get styles() {
        const hw = M3Slider.HandleWidth;
        const whw = M3Slider.WavyHandleWidth;
        const gap = M3Slider.Gap;
        const wh = M3Slider.WavyHeight;
        const ws = M3Slider.WaveStroke;

        return css`
            :host {
                display: block;
                --_hw: ${hw}px;
                --_gap: ${gap}px;

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
                width: max(0px, calc(var(--_f) * (100% - var(--_hw)) - var(--_gap)));
                height: 16px;
                border-radius: 8px 2px 2px 8px;
                background: var(--m3-slider-active-color);
            }
            .inactive {
                right: 0;
                width: max(0px, calc((1 - var(--_f)) * (100% - var(--_hw)) - var(--_gap)));
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
                left: calc(var(--_f) * (100% - var(--_hw)));
                width: var(--_hw);
                height: 44px;
                border-radius: 2px;
                background: var(--m3-slider-handle-color);
            }
            :host([variant=flat]) .dragging .handle {
                /* narrows to 2px while dragging, kept centered */
                width: 2px;
                margin-left: 1px;
                transition: width 100ms ease-out, margin-left 100ms ease-out, background-color 300ms ease-out;
            }
            .track:focus-visible .handle {
                outline: 2px solid var(--m3-slider-handle-color);
                outline-offset: 2px;
            }
            /* wavy */
            :host([variant=wavy]) {
                --_hw: ${whw}px;
            }
            :host([variant=wavy]) .track {
                height: ${wh}px;
            }
            .wave {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                overflow: visible;
                pointer-events: none;
            }
            .wave path {
                fill: none;
                stroke: var(--m3-slider-active-color);
                stroke-width: ${ws}px;
                stroke-linecap: round;
                stroke-linejoin: round;
                transition: stroke 300ms ease-out;
            }
            :host([variant=wavy]) .inactive {
                height: ${ws}px;
                border-radius: ${ws / 2}px;
            }
            :host([variant=wavy]) .handle {
                height: 34px;
                border-radius: 3px;
            }
            /* the wave is redrawn per frame, so the handle and inactive track follow the value without easing */
            :host([variant=wavy]) .inactive,
            :host([variant=wavy]) .handle {
                transition: background-color 300ms ease-out;
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
