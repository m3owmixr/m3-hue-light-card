import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { Consts } from '../types/consts';

/*
 * M3 switch: 52x32px track, 16px unselected / 24px selected handle, 28px while pressed.
 * Custom element (not ha-switch), so HA theme changes can't restyle it unexpectedly.
 * See doc/m3-design-spec.md (decision B).
 *
 * Events:
 * - change: fired after the user toggles it; read the new state from (ev.target).checked
 *
 * Colors can be overridden from outside:
 * --m3-switch-selected-track, --m3-switch-selected-handle,
 * --m3-switch-unselected-track, --m3-switch-unselected-outline, --m3-switch-unselected-handle
 */

@customElement(M3Switch.ElementName)
export class M3Switch extends LitElement {
    /**
     * Name of this Element
     */
    public static readonly ElementName = 'm3-switch' + Consts.ElementPostfix;

    @property({ type: Boolean, reflect: true })
    public checked: boolean = false;

    @property({ type: Boolean, reflect: true })
    public disabled: boolean = false;

    @state()
    private _pressed = false;

    private toggle(): void {
        if (this.disabled)
            return;

        this.checked = !this.checked;
        // HA frontend listens for this on window (mobile app haptic feedback)
        window.dispatchEvent(new CustomEvent('haptic', { detail: 'light' }));
        this.dispatchEvent(new Event('change'));
    }

    private onKeyDown(ev: KeyboardEvent): void {
        if (ev.key == ' ' || ev.key == 'Enter') {
            ev.preventDefault();
            this.toggle();
        }
    }

    private setPressed(pressed: boolean): void {
        this._pressed = pressed && !this.disabled;
    }

    protected override render() {
        return html`
            <div
                class=${classMap({ target: true, pressed: this._pressed })}
                role="switch"
                tabindex=${this.disabled ? -1 : 0}
                aria-checked=${this.checked ? 'true' : 'false'}
                aria-disabled=${this.disabled ? 'true' : 'false'}
                @click=${this.toggle}
                @keydown=${this.onKeyDown}
                @pointerdown=${() => this.setPressed(true)}
                @pointerup=${() => this.setPressed(false)}
                @pointerleave=${() => this.setPressed(false)}
                @pointercancel=${() => this.setPressed(false)}
            >
                <div class="track">
                    <div class="handle"></div>
                </div>
            </div>
        `;
    }

    public static override get styles() {
        return css`
            :host {
                display: inline-block;
                flex-shrink: 0;

                --m3-switch-selected-track: var(--md-sys-color-primary, var(--primary-color));
                --m3-switch-selected-handle: var(--md-sys-color-on-primary, #fff);
                --m3-switch-unselected-track: var(--md-sys-color-surface-container-highest, transparent);
                --m3-switch-unselected-outline: var(--md-sys-color-outline, var(--secondary-text-color));
                --m3-switch-unselected-handle: var(--m3-switch-unselected-outline);
            }
            .target {
                /* 48px tall touch target around the 32px track */
                display: flex;
                align-items: center;
                height: 48px;
                cursor: pointer;
                outline: none;
                -webkit-tap-highlight-color: transparent;
            }
            :host([disabled]) .target {
                cursor: default;
                opacity: 0.38;
            }
            .track {
                position: relative;
                box-sizing: border-box;
                width: 52px;
                height: 32px;
                border-radius: 16px;
                background: var(--m3-switch-unselected-track);
                /* inset shadow as the outline, so it doesn't shift the handle positions */
                box-shadow: inset 0 0 0 2px var(--m3-switch-unselected-outline);
                transition: background-color 200ms ease-out, box-shadow 200ms ease-out;
            }
            :host([checked]) .track {
                background: var(--m3-switch-selected-track);
                box-shadow: inset 0 0 0 2px var(--m3-switch-selected-track);
            }
            .handle {
                position: absolute;
                top: 50%;
                /* left is the handle's center */
                left: 16px;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                transform: translate(-50%, -50%);
                background: var(--m3-switch-unselected-handle);
                transition: left 200ms cubic-bezier(0.2, 0, 0, 1), width 150ms ease-out, height 150ms ease-out, background-color 200ms ease-out;
            }
            :host([checked]) .handle {
                left: 36px;
                width: 24px;
                height: 24px;
                background: var(--m3-switch-selected-handle);
            }
            .pressed .handle,
            :host([checked]) .pressed .handle {
                width: 28px;
                height: 28px;
            }
            /* 40px state layer behind the handle (hover / press) */
            .handle::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                transform: translate(-50%, -50%);
                background: var(--m3-switch-unselected-outline);
                opacity: 0;
                transition: opacity 150ms ease-out;
                pointer-events: none;
            }
            :host([checked]) .handle::before {
                background: var(--m3-switch-selected-track);
            }
            @media (hover: hover) {
                :host(:not([disabled])) .target:hover .handle::before {
                    opacity: 0.08;
                }
            }
            :host(:not([disabled])) .pressed .handle::before {
                opacity: 0.12;
            }
            .target:focus-visible .track {
                outline: 2px solid var(--m3-switch-selected-track);
                outline-offset: 2px;
            }
            @media (prefers-reduced-motion: reduce) {
                .track,
                .handle,
                .handle::before {
                    transition: none !important;
                }
            }
        `;
    }
}
