import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { Consts } from '../types/consts';
import { PageDotsMath } from '../core/page-dots-math';

/*
 * Dynamic M3 page indicator: the current page is a pill, at most maxVisible dots are shown in a window
 * that slides with the current page, and dots at a window edge with more pages beyond it shrink.
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

    /** Most dots shown at once. */
    @property({ type: Number })
    public maxVisible = 7;

    private static readonly slot = 12; // px: 6px dot + 6px gap
    private static readonly activeSlot = 30; // px: 24px pill + 6px gap

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

        const visible = Math.min(this.count, this.maxVisible);
        const start = PageDotsMath.windowStart(this.current, this.count, this.maxVisible);
        const width = (visible - 1) * M3PageDots.slot + M3PageDots.activeSlot;

        return html`
            <div class="window" style="width:${width}px">
                <div class="track" style="transform:translateX(${-start * M3PageDots.slot}px)">
                    ${Array.from({ length: this.count }, (_, i) => this.renderDot(i))}
                </div>
            </div>
        `;
    }

    private renderDot(page: number) {
        const scale = PageDotsMath.dotScale(page, this.current, this.count, this.maxVisible);
        return html`
            <button
                class=${classMap({ dot: true, current: page == this.current })}
                style="--_scale:${scale}"
                tabindex=${scale ? 0 : -1}
                aria-hidden=${scale ? nothing : 'true'}
                aria-label=${this.labelFormat.replace('%s', String(page + 1))}
                aria-current=${page == this.current ? 'true' : nothing}
                @click=${() => this.select(page)}
            ><span></span></button>
        `;
    }

    public static override get styles() {
        return css`
            :host {
                display: block;
                --_active: var(--m3-page-dots-active-color, var(--md-sys-color-on-surface, var(--primary-text-color)));
                --_dot: var(--m3-page-dots-color, var(--md-sys-color-on-surface-variant, var(--secondary-text-color)));
            }
            .window {
                margin: 0 auto;
                overflow: hidden;
                transition: width 200ms ease-out;
            }
            .track {
                display: flex;
                align-items: center;
                width: max-content;
                transition: transform 250ms ease-out;
            }
            button[aria-hidden] {
                pointer-events: none;
            }
            button {
                /* 24px touch target around the 6px dot, 6px visual gap */
                flex: none;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 12px;
                height: 24px;
                padding: 0 3px;
                margin: 0;
                border: none;
                background: none;
                cursor: pointer;
                border-radius: 12px;
                transition: width 200ms ease-out;
                -webkit-tap-highlight-color: transparent;
            }
            button span {
                display: block;
                width: 6px;
                height: 6px;
                border-radius: 3px;
                background: var(--_dot);
                opacity: 0.5;
                transform: scale(var(--_scale, 1));
                transition: width 200ms ease-out, opacity 200ms ease-out, transform 200ms ease-out;
            }
            button.current {
                width: 30px;
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
                .window, .track, button, button span {
                    transition: none;
                }
            }
        `;
    }
}
