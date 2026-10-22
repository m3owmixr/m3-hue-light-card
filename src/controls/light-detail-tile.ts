import { html, css, nothing, unsafeCSS, PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { Background } from '../core/colors/background';
import { Color } from '../core/colors/color';
import { ViewUtils } from '../core/view-utils';
import { Consts } from '../types/consts';
import { ISingleLightContainer } from '../types/types-interface';
import { HueDialogTile } from './dialog-tile';
import { HueDialogLightTile } from './dialog-light-tile';
import { noop } from '../types/functions';
import { IconHelper } from '../core/icon-helper';
import { HueLikeLightCardEntityConfig } from '../types/config';

export interface ILightDetailTileSelectDetail {
    lightContainer: ISingleLightContainer;
}

/**
 * Compact light tile under the color wheel, used to pick the light being adjusted (see doc/m3-wheel-spec.md).
 */
@customElement(HueLightDetailTile.ElementName)
export class HueLightDetailTile extends HueDialogTile {
    /**
     * Name of this Element
     */
    public static override readonly ElementName = HueDialogTile.ElementName + '-detail';

    @property()
    public lightContainer: ISingleLightContainer | null = null;

    @property()
    public entityConfig: HueLikeLightCardEntityConfig | null = null;

    @property()
    public defaultColor: Color | null = null;

    @property({ type: Boolean, reflect: true })
    public selected = false;

    private static readonly tileWidth = 88; // px
    private static readonly tileHeight = 104; // px
    private static readonly litTintAlpha = 0.26; // same as the light rows
    private static readonly outlineLighten = 0.45;

    private static readonly textColorCss = `var(--hue-text-color, ${Consts.TintOnSurfaceCss})`;

    /**
     * @returns Colors of a tile; null means the CSS default (see-through on-surface, text color).
     */
    public static tileColors(light: Color | null, isOn: boolean, isUnavailable: boolean, selected: boolean): { background: string | null, outline: string | null, foreground: string | null } {
        const lit = isOn && !isUnavailable && !!light;
        if (!lit) {
            return {
                background: null,
                outline: selected ? HueLightDetailTile.textColorCss : null,
                foreground: null
            };
        }

        const opaque = new Color(light!.getRed(), light!.getGreen(), light!.getBlue());
        if (!selected) {
            return {
                background: new Color(opaque.getRed(), opaque.getGreen(), opaque.getBlue(), HueLightDetailTile.litTintAlpha).toString(),
                outline: null,
                foreground: null
            };
        }

        return {
            background: opaque.toString(),
            outline: opaque.mix(Consts.LightColor, HueLightDetailTile.outlineLighten).toString(),
            foreground: opaque.getForeground(Consts.LightColor, Consts.DarkColor, 0).toString()
        };
    }

    public static override get styles() {
        return [
            HueDialogTile.hueDialogStyle,
            css`
    :host {
        display: block;
        flex: none;
    }
    .hue-tile.detail {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        width: ${HueLightDetailTile.tileWidth}px;
        height: ${HueLightDetailTile.tileHeight}px;
        padding: 10px 4px 8px;
        border-radius: 16px;
        background: var(--hue-detail-tile-background, color-mix(in srgb, ${unsafeCSS(Consts.TintOnSurfaceCss)} 8%, transparent));
        box-shadow: var(--hue-detail-tile-shadow, none);
        transition: background-color 200ms ease-out, box-shadow 200ms ease-out;
    }
    @media (prefers-reduced-motion: reduce) {
        .hue-tile.detail {
            transition: none;
        }
    }
    .tap-area {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        width: 100%;
        cursor: pointer;
        border-radius: 12px;
        color: var(--hue-detail-tile-foreground, ${unsafeCSS(Consts.TintOnSurfaceCss)});
    }
    .tap-area:focus-visible {
        outline: 2px solid ${unsafeCSS(Consts.TintOnSurfaceCss)};
        outline-offset: 2px;
    }
    .tap-area ha-icon {
        --mdc-icon-size: 24px;
    }
    .name {
        width: 100%;
        font-size: 13px;
        line-height: 16px;
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
    }
    .m3-switch {
        /* lit tile: the switch takes the light's color, like the light rows */
        --m3-switch-selected-track: var(--hue-row-switch-track, var(--md-sys-color-primary, var(--primary-color)));
        --m3-switch-selected-handle: var(--hue-row-switch-handle, var(--md-sys-color-on-primary, #fff));
    }
    `];
    }

    private lightColor(): Color | null {
        if (!this.lightContainer)
            return null;
        const defaultColorBg = this.defaultColor ? new Background([this.defaultColor]) : null;
        return (this.lightContainer.getBackground() || defaultColorBg)?.colors[0] ?? null;
    }

    // Can't be named 'updateStyles', because HA searches for that method and calls it instead of applying theme
    private updateStylesInner(): void {
        const light = this.lightContainer;
        const color = this.lightColor();
        const colors = HueLightDetailTile.tileColors(color, !!light?.isOn(), !!light?.isUnavailable(), this.selected);

        this.setOrRemove('--hue-detail-tile-background', colors.background);
        this.setOrRemove('--hue-detail-tile-shadow', colors.outline ? `inset 0 0 0 2px ${colors.outline}` : null);
        this.setOrRemove('--hue-detail-tile-foreground', colors.foreground);

        const switchColors = color && light?.isOn() ? HueDialogLightTile.switchColors(color) : null;
        this.setOrRemove('--hue-row-switch-track', switchColors?.track ?? null);
        this.setOrRemove('--hue-row-switch-handle', switchColors?.handle ?? null);
    }

    private setOrRemove(name: string, value: string | null) {
        if (value) {
            this.style.setProperty(name, value);
        }
        else {
            this.style.removeProperty(name);
        }
    }

    protected override updated(changedProps: PropertyValues<HueLightDetailTile>): void {
        if (changedProps.has('lightContainer')) {
            const oldValue = changedProps.get('lightContainer') as ISingleLightContainer | null;
            if (oldValue) {
                oldValue.unregisterOnPropertyChanged(this._elementId);
            }
            if (this.lightContainer) {
                this.lightContainer.registerOnPropertyChanged(this._elementId, () => this.requestUpdate());
            }
        }

        this.updateStylesInner();
    }

    @query('.hue-tile .tap-area')
    protected override clickTarget!: HTMLDivElement;

    protected override tileClicked() {
        if (!this.lightContainer)
            return;

        this.dispatchEvent(new CustomEvent<ILightDetailTileSelectDetail>('tile-select', {
            detail: {
                lightContainer: this.lightContainer
            }
        }));
    }

    protected override getEntityId() {
        return this.lightContainer?.getEntityId();
    }

    protected override render() {
        if (!this.lightContainer)
            return nothing;

        const title = this.entityConfig
            ? this.entityConfig.getTitle(this.lightContainer).resolveToString(this._hass)
            : this.lightContainer.getTitle().resolveToString(null);
        const icon = this.entityConfig?.icon ?? this.lightContainer.getIcon() ?? IconHelper.getIcon(1);

        return html`
        <div class='hue-tile detail' title='${title}'>
            <div class='tap-area' aria-pressed='${this.selected}'>
                <ha-icon icon="${icon}"></ha-icon>
                <div class='name'>${title}</div>
            </div>
            ${ViewUtils.createM3Switch(this.lightContainer, noop)}
        </div>
        `;
    }

    public override connectedCallback(): void {
        super.connectedCallback();

        if (this.lightContainer) {
            this.lightContainer.registerOnPropertyChanged(this._elementId, () => this.requestUpdate());
        }
    }

    public override disconnectedCallback(): void {
        super.disconnectedCallback();

        if (this.lightContainer) {
            this.lightContainer.unregisterOnPropertyChanged(this._elementId);
        }
    }
}
