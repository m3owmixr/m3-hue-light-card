import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { Consts } from '../types/consts';

/*
 * M3 carousel-style page dots: small dots, the current page drawn as a wider pill.
 * See doc/m3-dialog-spec.md (Scenes).
 *
 * Events:
 * - page-select: CustomEvent<{ page: number }> (0-based) when a dot is clicked
 *
 * Colors can be overridden from outside:
 * --m3-page-dots-active-color, --m3-page-dots-color
 */

@customElement(M3PageDots.ElementName)
export class M3PageDots extends LitElement {
    /**
     * Name of this Element
     */
    public static readonly ElementName = 'm3-page-dots' + Consts.ElementPostfix;

    /** Number of pages; nothing is rendered for less than 2. */
    @property({ type: Number })
    public count = 0;

    /** 0-based current page. */
    @property({ type: Number })
    public current = 0;

    /** Accessible label of a dot, %s is replaced with the 1-based page number. */
    @property()
    public labelFormat = 'Page %s';

    private select(page: number): void {
        this.dispatchEvent(new CustomEvent<{ page: number }>('page-select', {
            detail: { page },
            bubbles: true,
            composed: true
        }));
    }

    protected override render() {
        if (this.count < 2)
            return nothing;

        return html`
            <div class="dots">
                ${Array.from({ length: this.count }, (_, i) => html`
                    <button
                        class=${classMap({ dot: true, current: i == this.current })}
                        aria-label=${this.labelFormat.replace('%s', String(i + 1))}
                        aria-current=${i == this.current ? 'true' : nothing}
                        @click=${() => this.select(i)}
                    ><span></span></button>
                `)}
            </div>
        `;
    }

    public static override get styles() {
        return css`
            :host {
                display: block;
                --_active: var(--m3-page-dots-active-color, var(--md-sys-color-on-surface, var(--primary-text-color)));
                --_dot: var(--m3-page-dots-color, var(--md-sys-color-on-surface-variant, var(--secondary-text-color)));
            }
            .dots {
                display: flex;
                justify-content: center;
                align-items: center;
            }
            button {
                /* 24px touch target around the 6px dot, 6px visual gap */
                display: flex;
                align-items: center;
                justify-content: center;
                min-width: 12px;
                height: 24px;
                padding: 0 3px;
                margin: 0;
                border: none;
                background: none;
                cursor: pointer;
                border-radius: 12px;
                -webkit-tap-highlight-color: transparent;
            }
            button span {
                display: block;
                width: 6px;
                height: 6px;
                border-radius: 3px;
                background: var(--_dot);
                opacity: 0.5;
                transition: width 200ms ease-out, opacity 200ms ease-out;
            }
            button.current span {
                width: 24px;
                background: var(--_active);
                opacity: 1;
            }
            button:focus-visible {
                outline: 2px solid var(--_active);
                outline-offset: -2px;
            }
            @media (prefers-reduced-motion: reduce) {
                button span {
                    transition: none;
                }
            }
        `;
    }
}
