import { LitElement, PropertyValues, css, html, nothing, unsafeCSS } from 'lit';
import { classMap } from 'lit-html/directives/class-map.js';
import { customElement, property } from 'lit/decorators.js';
import { Consts } from '../types/consts';
import { HueColorTempPicker, HueColorTempPickerMode } from './color-temp-picker';

export type HueColorTempModeSelectorMode = HueColorTempPickerMode | 'brightness';

/**
 * Mode selector for Color and Temp picker.
 */
@customElement(HueColorTempModeSelector.ElementName)
export class HueColorTempModeSelector extends LitElement {
    /**
     * Name of this Element
     */
    public static readonly ElementName = 'hue-color-temp-mode-selector' + Consts.ElementPostfix;

    public constructor() {
        super();
    }

    @property()
    public mode: HueColorTempModeSelectorMode = 'color';

    @property()
    public showColor = true;

    @property()
    public showTemp = true;

    @property()
    public colorPicker: HueColorTempPicker | null = null;

    /** Accessible names of the options (localized by the light detail). */
    @property()
    public labels: { color: string, temp: string } = { color: 'Color', temp: 'Temperature' };

    /**
     * Will select possible mode based on current property settings.
     * Will try to let the current mode selected, if possible.
     * Will never select 'brightness mode'.
     */
    public selectPossibleMode() {
        if (this.mode == 'color' && this.showColor)
            return;

        if (this.mode == 'temp' && this.showTemp)
            return;

        if (this.showColor) {
            this.mode = 'color';
        }
        else if (this.showTemp) {
            this.mode = 'temp';
        }
    }

    protected override updated(changedProps: PropertyValues<HueColorTempModeSelector>): void {
        super.updated(changedProps);

        if (changedProps.has('colorPicker')) {
            this.unregisterColorPickerEvent(changedProps.get('colorPicker'));
            if (this.colorPicker) {
                this.onColorPickerModeChange();
                this.registerColorPickerEvent();
            }
        }

        if (changedProps.has('mode') && this.colorPicker) {
            if (this.mode == 'color' || this.mode == 'temp') {
                this.colorPicker.mode = this.mode;
            }
        }

    }

    /**
     * @returns Whether the toggle is shown: it needs two modes to choose from (spec: a single-mode light hides it).
     */
    public static shouldRender(mode: HueColorTempModeSelectorMode, showColor: boolean, showTemp: boolean): boolean {
        return mode != 'brightness' && showColor && showTemp;
    }

    private static readonly trackPadding = 4;
    private static readonly optionWidth = 52;
    private static readonly optionHeight = 40;
    private static readonly iconSize = 22;
    public static readonly totalHeight = HueColorTempModeSelector.optionHeight + 2 * HueColorTempModeSelector.trackPadding;

    private static readonly textColorCss = `var(--hue-text-color, ${Consts.TintOnSurfaceCss})`;

    /* M3 Expressive connected toggle, drawn in the screen's text color (see doc/m3-wheel-spec.md) */
    public static override styles = css`
    :host{
        user-select: none;
        -webkit-user-select: none;
        display: inline-block;
    }
    .track{
        box-sizing: border-box;
        display: flex;
        gap: 2px;
        height: ${HueColorTempModeSelector.totalHeight}px;
        padding: ${HueColorTempModeSelector.trackPadding}px;
        border-radius: ${HueColorTempModeSelector.totalHeight / 2}px;
        background: color-mix(in srgb, ${unsafeCSS(HueColorTempModeSelector.textColorCss)} 12%, transparent);
    }
    .option{
        display: flex;
        align-items: center;
        justify-content: center;
        width: ${HueColorTempModeSelector.optionWidth}px;
        height: ${HueColorTempModeSelector.optionHeight}px;
        padding: 0;
        border: none;
        border-radius: ${HueColorTempModeSelector.optionHeight / 2}px;
        background: transparent;
        color: ${unsafeCSS(HueColorTempModeSelector.textColorCss)};
        cursor: pointer;
        --mdc-icon-size: ${HueColorTempModeSelector.iconSize}px;
        transition: background-color 200ms ease-out, color 200ms ease-out;
    }
    .option:not(.selected):hover{
        background: color-mix(in srgb, ${unsafeCSS(HueColorTempModeSelector.textColorCss)} 8%, transparent);
    }
    .option:focus-visible{
        outline: 2px solid ${unsafeCSS(HueColorTempModeSelector.textColorCss)};
        outline-offset: 2px;
    }
    .option.selected{
        background: ${unsafeCSS(HueColorTempModeSelector.textColorCss)};
        /* the surface color contrasts with the text-colored pill */
        color: var(--hue-detail-on-text-color, ${unsafeCSS(Consts.TintSurfaceCss)});
    }
    @media (prefers-reduced-motion: reduce) {
        .option{
            transition: none;
        }
    }
    `;

    protected override render() {
        if (!HueColorTempModeSelector.shouldRender(this.mode, this.showColor, this.showTemp))
            return nothing;

        return html`
        <div class='track' role='group'>
            ${this.createOption('color', 'mdi:palette', this.labels.color)}
            ${this.createOption('temp', 'mdi:thermometer', this.labels.temp)}
        </div>`;
    }

    private createOption(mode: HueColorTempPickerMode, icon: string, label: string) {
        const selected = this.mode == mode;
        const optionClass = {
            'option': true,
            'selected': selected
        };

        return html`
        <button class='${classMap(optionClass)}' aria-pressed='${selected}' aria-label='${label}' title='${label}' @click=${() => this.mode = mode}>
            <ha-icon icon='${icon}'></ha-icon>
        </button>`;
    }

    private onColorPickerModeChange = () => {
        if (this.colorPicker) {
            this.mode = this.colorPicker.mode;
        }
    };

    private registerColorPickerEvent() {
        if (this.colorPicker) {
            this.colorPicker.addEventListener('mode-change', this.onColorPickerModeChange);
        }
    }

    private unregisterColorPickerEvent(picker?: HueColorTempPicker | null) {
        if (picker) {
            picker.removeEventListener('mode-change', this.onColorPickerModeChange);
        }
    }

    public override connectedCallback(): void {
        super.connectedCallback();


        this.registerColorPickerEvent();
    }

    public override disconnectedCallback(): void {
        super.disconnectedCallback();

        this.unregisterColorPickerEvent(this.colorPicker);
    }
}