import { html, css, nothing, unsafeCSS, PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { Background } from '../core/colors/background';
import { Color } from '../core/colors/color';
import { ViewUtils } from '../core/view-utils';
import { Consts } from '../types/consts';
import { ISingleLightContainer } from '../types/types-interface';
import { HueDialogTile, ITileEventDetail } from './dialog-tile';
import { noop } from '../types/functions';
import { IconHelper } from '../core/icon-helper';
import { HueLikeLightCardEntityConfig } from '../types/config';
import { localize } from '../localize/localize';

export interface ILightSelectedEventDetail extends ITileEventDetail {
    isSelected: boolean;
    lightContainer: ISingleLightContainer | null;
}

/**
 * Represents Light row element in HueDialog (full-width M3 list row, see doc/m3-dialog-spec.md).
 */
@customElement(HueDialogLightTile.ElementName)
export class HueDialogLightTile extends HueDialogTile {

    /**
     * Name of this Element
     */
    public static override readonly ElementName = HueDialogTile.ElementName + '-light';

    @property()
    public lightContainer: ISingleLightContainer | null = null;

    @property()
    public entityConfig: HueLikeLightCardEntityConfig | null = null;

    @property()
    public defaultColor: Color | null = null;

    private static readonly rowHeight = 64; // px
    private static readonly rowTintAlpha = 0.26;
    private static readonly badgeTintAlpha = 0.55;

    /**
     * @returns Status line of a light row: unavailable, off, brightness in % or on (lights without brightness).
     */
    public static statusText(isOn: boolean, isUnavailable: boolean, supportsBrightness: boolean, brightness: number, labels: { on: string, off: string, unavailable: string }): string {
        if (isUnavailable)
            return labels.unavailable;
        if (!isOn)
            return labels.off;
        if (supportsBrightness)
            return `${Math.round(brightness)}%`;
        return labels.on;
    }

    public static override get styles() {
        return [
            HueDialogTile.hueDialogStyle,
            css`
    :host {
        display: block;
    }
    .hue-tile.light {
        display: flex;
        align-items: center;
        gap: 16px;
        width: 100%;
        height: ${HueDialogLightTile.rowHeight}px;
        padding: 0 16px;
        border-radius: 4px;
        background: var(--hue-light-row-background, color-mix(in srgb, ${unsafeCSS(Consts.TintOnSurfaceCss)} 7%, transparent));
        transition: ${unsafeCSS(Consts.TransitionDefault)};
    }
    /* grouped rows: rounded outer corners only */
    :host(:first-child) .hue-tile.light {
        border-top-left-radius: 16px;
        border-top-right-radius: 16px;
    }
    :host(:last-child) .hue-tile.light {
        border-bottom-left-radius: 16px;
        border-bottom-right-radius: 16px;
    }
    .tap-area {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 16px;
        height: 100%;
        cursor: pointer;
        border-radius: 12px;
    }
    .tap-area:focus-visible {
        outline: 2px solid ${unsafeCSS(Consts.TintOnSurfaceCss)};
        outline-offset: 2px;
    }
    .badge {
        flex: none;
        width: 40px;
        height: 40px;
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--hue-light-badge-background, color-mix(in srgb, ${unsafeCSS(Consts.TintOnSurfaceCss)} 10%, transparent));
        color: ${unsafeCSS(Consts.TintOnSurfaceCss)};
    }
    .text {
        min-width: 0;
        display: flex;
        flex-direction: column;
    }
    .name {
        /* M3 body-large */
        color: ${unsafeCSS(Consts.TintOnSurfaceCss)};
        font-size: var(--md-sys-typescale-body-large-size, 16px);
        line-height: var(--md-sys-typescale-body-large-line-height, 24px);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .status {
        /* M3 body-small */
        color: var(--md-sys-color-on-surface-variant, var(--secondary-text-color));
        font-size: var(--md-sys-typescale-body-small-size, 12px);
        line-height: var(--md-sys-typescale-body-small-line-height, 16px);
    }
    .switch {
        flex: none;
        display: flex;
        align-items: center;
    }
    `];
    }

    // Can't be named 'updateStyles', because HA searches for that method and calls it instead of applying theme
    private updateStylesInner(): void {
        if (this.lightContainer?.isOn()) {
            // lit row: see-through tint of the light's own color
            const defaultColorBg = this.defaultColor ? new Background([this.defaultColor]) : null;
            const color = (this.lightContainer.getBackground() || defaultColorBg)?.colors[0];
            if (color) {
                const r = color.getRed(), g = color.getGreen(), b = color.getBlue();
                this.style.setProperty('--hue-light-row-background', new Color(r, g, b, HueDialogLightTile.rowTintAlpha).toString());
                this.style.setProperty('--hue-light-badge-background', new Color(r, g, b, HueDialogLightTile.badgeTintAlpha).toString());
                return;
            }
        }

        this.style.removeProperty('--hue-light-row-background');
        this.style.removeProperty('--hue-light-badge-background');
    }

    protected override updated(changedProps: PropertyValues<HueDialogLightTile>): void {
        // register for changes on light
        if (changedProps.has('lightContainer')) {
            const oldValue = changedProps.get('lightContainer') as ISingleLightContainer | null;
            if (oldValue) {
                oldValue.unregisterOnPropertyChanged(this._elementId);
            }
            if (this.lightContainer) {
                this.lightContainer.registerOnPropertyChanged(this._elementId, () => this.lightUpdated());
            }
        }

        this.updateStylesInner();
    }

    private lightUpdated() {
        this.requestUpdate();
    }

    @query('.hue-tile .tap-area')
    protected override clickTarget!: HTMLDivElement;

    protected override tileClicked() {
        // rows are hidden while the detail is open, so a tap always opens it
        this.dispatchEvent(new CustomEvent<ILightSelectedEventDetail>('selected-change', {
            detail: {
                isSelected: true,
                lightContainer: this.lightContainer,
                tileElement: this
            }
        }));
    }

    protected override getEntityId() {
        return this.lightContainer?.getEntityId();
    }

    protected override render() {
        if (!this.lightContainer)
            return nothing;

        let title: string;
        if (this.entityConfig) {
            title = this.entityConfig.getTitle(this.lightContainer).resolveToString(this._hass);
        }
        else {
            title = this.lightContainer.getTitle().resolveToString(null);
        }

        const icon = this.entityConfig?.icon ?? this.lightContainer.getIcon() ?? IconHelper.getIcon(1);
        const status = HueDialogLightTile.statusText(
            this.lightContainer.isOn(),
            this.lightContainer.isUnavailable(),
            this.lightContainer.features.brightness,
            this.lightContainer.brightnessValue,
            {
                on: localize(this._hass, 'dialog.light.on'),
                off: localize(this._hass, 'dialog.light.off'),
                unavailable: localize(this._hass, 'dialog.light.unavailable')
            }
        );

        /*eslint-disable */
        return html`
        <div class='hue-tile light' title='${title}'>
            <div class='tap-area'>
                <div class='badge'>
                    <ha-icon icon="${icon}"></ha-icon>
                </div>
                <div class='text'>
                    <div class='name'>${title}</div>
                    <div class='status'>${status}</div>
                </div>
            </div>
            <div class='switch'>
                ${ViewUtils.createM3Switch(this.lightContainer, noop)}
            </div>
        </div>
        `;
        /*eslint-enable */
    }

    public override connectedCallback(): void {
        super.connectedCallback();

        if (this.lightContainer) {
            this.lightContainer.registerOnPropertyChanged(this._elementId, () => this.lightUpdated());
        }
    }

    public override disconnectedCallback(): void {
        super.disconnectedCallback();

        if (this.lightContainer) {
            this.lightContainer.unregisterOnPropertyChanged(this._elementId);
        }
    }
}
