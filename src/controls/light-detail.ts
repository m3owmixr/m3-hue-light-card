import { customElement, property } from 'lit/decorators.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { styleMap } from 'lit/directives/style-map.js';
import { IdLitElement } from '../core/id-lit-element';
import { Consts } from '../types/consts';
import { PropertyValues, css, nothing, unsafeCSS } from 'lit';
import { HueColorTempPicker, IHueColorTempPickerEventDetail } from './color-temp-picker';
import { HueColorTempPickerMarker } from './color-temp-picker.marker';
import { HueColorTempModeSelector } from './color-temp-mode-selector';
import { HaControlSwitch } from '../types/types-hass';
import { HueBigSwitch } from './big-switch';
import { IconHelper } from '../core/icon-helper';
import { AreaLightController } from '../core/area-light-controller';
import { ILightContainer, ISingleLightContainer } from '../types/types-interface';
import { Action, Action1, noop } from '../types/functions';
import { Color } from '../core/colors/color';
import { LightDetailLayout } from '../core/light-detail-layout';
import { ViewUtils } from '../core/view-utils';
import { HueLikeLightCardConfig, HueLikeLightCardEntityConfigCollection } from '../types/config';
import { ActionHandler } from '../core/action-handler';
import { HueLightDetailTile, ILightDetailTileSelectDetail } from './light-detail-tile';
import { horizontalScroll } from '../directives/horizontal-scroll';
import { localize } from '../localize/localize';

/**
 * The color wheel screen: top bar, wheel, mode toggle and brightness slider, and light tiles (see doc/m3-wheel-spec.md).
 */
@customElement(HueLightDetail.ElementName)
export class HueLightDetail extends IdLitElement {
    /**
     * Name of this Element
     */
    public static readonly ElementName = 'hue-light-detail' + Consts.ElementPostfix;

    private _colorPicker: HueColorTempPicker;
    private _modeSelector: HueColorTempModeSelector;
    private _lightMarkerManager: LightMarkerManager;
    private _resizeObserver: ResizeObserver | null = null;

    public constructor() {
        super('HueLightDetail');

        this.hide(true);
    }

    @property()
    public areaController: AreaLightController;

    @property()
    public lightContainer: ILightContainer | null = null;

    @property()
    public config: HueLikeLightCardConfig | null = null;

    @property()
    public entitiesConfig: HueLikeLightCardEntityConfigCollection | null = null;

    @property()
    public actionHandler: ActionHandler | null = null;

    /**
     * Called after new lightContainer is set.
     */
    private onLightContainerChanged() {
        if (!this.lightContainer)
            return;

        // off lights only show their marker while selected, so mark the selection before activating
        this._lightMarkerManager?.setSelected(this.selectedIds());

        // the switch-only view is drawn by render
        if (this.lightContainer.features.isEmpty()) {
            this.updateSizes();
            return;
        }

        const lightFeatures = this.lightContainer.features;

        this._modeSelector.showColor = lightFeatures.color;
        this._modeSelector.showTemp = lightFeatures.colorTemp;
        if (lightFeatures.colorTemp &&
            lightFeatures.colorTempMinKelvin &&
            lightFeatures.colorTempMaxKelvin) {
            // set new temp range
            this._colorPicker.setTempRange(lightFeatures.colorTempMinKelvin, lightFeatures.colorTempMaxKelvin);
        }

        if (lightFeatures.isOnlyBrightness()) {
            this._modeSelector.mode = 'brightness';
        }
        else {
            this._modeSelector.selectPossibleMode();
        }

        this.onLightContainerState(this.lightContainer, true);// set mode, when changing light
        this.updateSizes();
    }

    private selectedIds(): string[] {
        return this.lightContainer?.getLights().map(l => l.getEntityId()) ?? [];
    }

    private createAreaControllerMarkers() {
        if (this.areaController && this._lightMarkerManager) {
            this._lightMarkerManager.clear();
            this._lightMarkerManager.add(...this.areaController.getLights());
        }
    }

    private setLightContainerFromPicker(lights: ISingleLightContainer[]) {
        if (lights.length == 1) {
            this.lightContainer = lights[0];
        }
        else {
            const entities = lights.map(l => l.getEntityId());
            const controller = new AreaLightController(entities, this.areaController.defaultColor);
            controller.hass = this.areaController.hass;
            this.lightContainer = controller;
        }

        this.dispatchEvent(new Event('lightcontainer-change'));
    }

    /**
     * Makes the given light the one being adjusted (a tap on its tile).
     */
    public selectLight(light: ISingleLightContainer) {
        this.lightContainer = light;
        this.dispatchEvent(new Event('lightcontainer-change'));
    }

    private onLightContainerState(light: ILightContainer, activate = false) {
        const lights = light.getLights();
        let singleLight = null;
        if (lights.length == 1) {
            singleLight = lights[0];
        }

        if (singleLight) {
            this._lightMarkerManager.applyState(singleLight, !activate); // non active lights can be unmerged
        }

        if (activate && singleLight) {

            if (singleLight.isColorModeColor()) {
                this._modeSelector.mode = 'color';
            }
            else if (singleLight.isColorModeTemp()) {
                this._modeSelector.mode = 'temp';
            }

            const marker = this._lightMarkerManager.getMarker(singleLight);
            marker?.setActive();
        }
    }

    private onColorChanged(ev: CustomEvent<IHueColorTempPickerEventDetail>) {
        const marker = ev.detail.marker;
        const light = this._lightMarkerManager.getLight(marker);

        this._lightMarkerManager.suspendStateUpdate(() => {
            if (ev.detail.mode == 'temp') {
                light.colorTemp = ev.detail.newTemp;
            }
            else if (ev.detail.mode == 'color') {
                light.color = ev.detail.newColor;
            }
        });
    }

    public activate(light: ISingleLightContainer) {
        const marker = this._lightMarkerManager.getMarker(light);
        if (marker) {
            marker.setActive();
        }
    }

    /**
     * @returns Height this screen needs to show the wheel at its usual size (the dialog grows to fit).
     */
    public requiredHeight(): number {
        const lights = this.areaController?.getLights() ?? [];
        return LightDetailLayout.requiredHeight(this.clientWidth, LightDetailLayout.showsTiles(lights.length));
    }

    /** Will show this element (with animation). */
    public show() {
        if (this._hideTimeout) {
            clearTimeout(this._hideTimeout);
            this._hideTimeout = null;
        }

        this.style.removeProperty('display');
        setTimeout(() => this.classList.add('visible'));
        this.updateSizes();

        // to allow the color marker to overflow parent div
        if (this.parentElement) {
            this.parentElement.style.overflow = 'visible';
        }

        // fire show event
        this.dispatchEvent(new CustomEvent('show'));
    }

    private _hideTimeout: NodeJS.Timeout | null;

    /** Will hide this element (with animation). */
    public hide(instant = false) {

        // check for visibility
        const wasVisible = this.classList.contains('visible');

        this.classList.remove('visible');
        if (instant) {
            this.style.display = 'none';
        }
        else {
            this._hideTimeout = setTimeout(() => {
                this._hideTimeout = null;
                this.style.display = 'none';
            }, 300);
        }

        // remove temporary overflow allowing
        if (this.parentElement) {
            this.parentElement.style.overflow = '';
        }

        // fire hide event (only when the element was visible)
        if (wasVisible) {
            this.dispatchEvent(new CustomEvent('hide'));
        }
    }

    private registerLightsPropertyChanged(areaController: AreaLightController) {
        areaController.getLights().forEach(l => {
            l.registerOnPropertyChanged(this._elementId, () => {
                this.onLightContainerState(l);
                this.requestUpdate();
            }, /* includeHass: */ true);
        });
    }

    private unregisterLightsPropertyChanged(areaController: AreaLightController) {
        areaController.getLights().forEach(l => l.unregisterOnPropertyChanged(this._elementId));
    }

    protected override updated(changedProps: PropertyValues<HueLightDetail>): void {
        // register all lights from controller
        if (changedProps.has('areaController')) {
            const oldValue = changedProps.get('areaController') as AreaLightController | null;
            if (oldValue) {
                this.unregisterLightsPropertyChanged(oldValue);
            }
            if (this.areaController) {
                this.registerLightsPropertyChanged(this.areaController);
                this.createAreaControllerMarkers();
            }
        }

        if (changedProps.has('lightContainer')) {
            if (this.areaController) {
                this.onLightContainerChanged();
            }

            // keep the selected tile in view
            const tile = HueLightDetail.findSelectedTile(this.renderRoot);
            if (tile && typeof tile.scrollIntoView == 'function') {
                tile.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
        }
    }

    /**
     * @returns The selected light tile. Reads the property: tiles reflect `selected` to the attribute only in their own later update.
     */
    public static findSelectedTile(root: ParentNode): HueLightDetailTile | null {
        const tiles = Array.from(root.querySelectorAll<HueLightDetailTile>(HueLightDetailTile.ElementName));
        return tiles.find(t => t.selected) ?? null;
    }

    private static readonly textColorCss = `var(--hue-text-color, ${Consts.TintOnSurfaceCss})`;
    private static readonly variantColorCss = 'var(--md-sys-color-on-surface-variant, var(--secondary-text-color))';

    public static override styles = css`
    :host {
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        padding-bottom: ${LightDetailLayout.gap}px;
        margin-top: -30px;
        opacity: 0;
        transition:${unsafeCSS(Consts.TransitionDefault)};
    }
    :host(.visible) {
        margin-top: 0;
        opacity: 1;
    }
    @media (prefers-reduced-motion: reduce) {
        :host {
            transition: none;
        }
    }

    .top-bar {
        flex: none;
        display: flex;
        align-items: center;
        gap: 4px;
        height: ${LightDetailLayout.topBarHeight}px;
        padding: 0 ${LightDetailLayout.sidePadding}px 0 4px;
    }
    .back-button {
        flex: none;
        --mdc-icon-button-size: 40px;
        /* ha-icon-button ignores color in this dialog and takes the theme accent unless these are set too */
        --icon-primary-color: var(--hue-screen-back-button-color, ${unsafeCSS(HueLightDetail.textColorCss)});
        --wa-color-on-normal: var(--hue-screen-back-button-color, ${unsafeCSS(HueLightDetail.textColorCss)});
        color: var(--hue-screen-back-button-color, ${unsafeCSS(HueLightDetail.textColorCss)});
    }
    .title {
        /* M3 title-large */
        flex: 1;
        min-width: 0;
        font-size: var(--md-sys-typescale-title-large-size, 22px);
        line-height: var(--md-sys-typescale-title-large-line-height, 28px);
        font-weight: 400;
        color: ${unsafeCSS(Consts.TintOnSurfaceCss)};
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .wheel-wrap {
        flex: 1;
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: ${LightDetailLayout.gap}px 0;
    }
    .wheel-area {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .color-picker {
        display: block;
    }
    .hidden {
        display: none !important;
    }
    .brightness-icon {
        --mdc-icon-size: 64px;
        color: ${unsafeCSS(HueLightDetail.variantColorCss)};
    }

    .controls {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        height: ${LightDetailLayout.controlRowHeight}px;
        padding: 0 ${LightDetailLayout.sidePadding}px;
    }
    /* on/off-only lights: the row keeps its space, so the wheel area doesn't move */
    .controls.invisible {
        visibility: hidden;
    }
    .controls .brightness-slider {
        flex: 1;
        min-width: 0;
    }
    .controls .brightness-slider.tinted {
        --m3-slider-active-color: ${unsafeCSS(HueLightDetail.textColorCss)};
        --m3-slider-inactive-color: color-mix(in srgb, ${unsafeCSS(HueLightDetail.textColorCss)} 24%, transparent);
        --m3-slider-stop-color: color-mix(in srgb, ${unsafeCSS(HueLightDetail.textColorCss)} 60%, transparent);
    }
    .percent {
        /* M3 body-medium */
        flex: none;
        width: 40px;
        margin-left: auto;
        text-align: right;
        font-size: var(--md-sys-typescale-body-medium-size, 14px);
        line-height: var(--md-sys-typescale-body-medium-line-height, 20px);
        color: ${unsafeCSS(HueLightDetail.variantColorCss)};
    }

    .heading {
        /* M3 label-medium, same as the scene screen's section titles */
        flex: none;
        box-sizing: border-box;
        display: flex;
        align-items: flex-end;
        height: ${LightDetailLayout.headingHeight}px;
        margin-top: ${LightDetailLayout.gap}px;
        padding: 0 ${LightDetailLayout.sidePadding}px 8px;
        font-size: var(--md-sys-typescale-label-medium-size, 12px);
        line-height: var(--md-sys-typescale-label-medium-line-height, 16px);
        font-weight: 500;
        color: ${unsafeCSS(HueLightDetail.variantColorCss)};
    }
    .tiles {
        flex: none;
        display: flex;
        gap: 8px;
        height: ${LightDetailLayout.tileRowHeight}px;
        padding: 0 ${LightDetailLayout.sidePadding}px;
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: none;
    }
    .tiles::-webkit-scrollbar {
        display: none;
    }
    .tiles::after {
        /* keeps the right padding when the row overflows */
        content: '';
        flex: none;
        width: 8px;
    }
    `;

    private _lastRenderedContainer: ILightContainer | null;
    protected override render() {
        const container = this._lastRenderedContainer = this.lightContainer || this._lastRenderedContainer;
        const kind = container ? LightDetailLayout.detailKind(container.features) : 'wheel';
        const hass = this.areaController?.hass;
        const lights = this.areaController?.getLights() ?? [];
        const hasTiles = LightDetailLayout.showsTiles(lights.length);
        const selectedIds = this.selectedIds();

        return html`
        <div class='top-bar'>
            <ha-icon-button-arrow-prev class='back-button'
                .label=${hass ? localize(hass, 'dialog.detail.back') : 'Back'}
                @click=${() => this.hide()}>
            </ha-icon-button-arrow-prev>
            <div class='title'>${this.getTitle(container)}</div>
        </div>
        <div class='wheel-wrap'>
            <div class='wheel-area'>
                <${unsafeStatic(HueColorTempPicker.ElementName)} class='color-picker ${kind == 'wheel' ? '' : 'hidden'}'
                    @change=${(ev: CustomEvent) => this.onColorChanged(ev)}>
                </${unsafeStatic(HueColorTempPicker.ElementName)}>
                ${kind == 'switch' ? this.createSwitchDetail() : nothing}
                ${kind == 'brightness' && container ? html`
                <ha-icon class='brightness-icon' icon='${container.getIcon() ?? IconHelper.getIcon(1)}'></ha-icon>` : nothing}
            </div>
        </div>
        <div class='controls ${kind == 'switch' ? 'invisible' : ''}'>
            <${unsafeStatic(HueColorTempModeSelector.ElementName)} class='mode-selector'
                .labels=${{
        color: hass ? localize(hass, 'dialog.detail.color') : 'Color',
        temp: hass ? localize(hass, 'dialog.detail.temp') : 'Temperature'
    }}>
            </${unsafeStatic(HueColorTempModeSelector.ElementName)}>
            ${container && this.config ? ViewUtils.createSlider(container, this.config, noop, true) : nothing}
            <div class='percent'>${this.getPercent(container)}</div>
        </div>
        ${hasTiles ? html`
        <div class='heading'>${hass ? localize(hass, 'dialog.lights') : 'Lights'}</div>
        <div class='tiles' ${horizontalScroll()}>
            ${lights.map(l => html`
            <${unsafeStatic(HueLightDetailTile.ElementName)}
                .lightContainer=${l}
                .entityConfig=${this.entitiesConfig?.getConfig(l.getEntityId()) ?? null}
                .defaultColor=${this.areaController.defaultColor}
                .selected=${LightDetailLayout.isSelected(l.getEntityId(), selectedIds)}
                .hass=${hass}
                .actionHandler=${this.actionHandler}
                @tile-select=${(e: CustomEvent<ILightDetailTileSelectDetail>) => this.selectLight(e.detail.lightContainer)}>
            </${unsafeStatic(HueLightDetailTile.ElementName)}>`)}
        </div>` : nothing}
        `;
    }

    private getTitle(container: ILightContainer | null): string {
        if (!container)
            return '';

        const hass = this.areaController?.hass ?? null;
        return LightDetailLayout.title(container.getLights().map(l => this.entitiesConfig
            ? this.entitiesConfig.getConfig(l.getEntityId()).getTitle(l).resolveToString(hass)
            : l.getTitle().resolveToString(null)));
    }

    private getPercent(container: ILightContainer | null): string {
        if (!container)
            return '';
        if (container.isOn())
            return `${Math.round(container.brightnessValue)}%`;

        const hass = this.areaController?.hass;
        return hass ? localize(hass, 'dialog.light.off') : 'Off';
    }

    private onSwitch(ctrl: ILightContainer, ev: Event) {
        const target = <HaControlSwitch>ev.target;
        if (!target)
            return;

        const checked = target.checked;
        if (checked) {
            ctrl.turnOn();
        }
        else {
            ctrl.turnOff();
        }
    }

    private createSwitchDetail() {
        const light = this._lastRenderedContainer!;
        const colors = {
            '--control-switch-on-color': Consts.WarmColor,
            '--control-switch-off-color': Consts.OffColor
        };

        return html`
            <${unsafeStatic(HueBigSwitch.ElementName)} class='light-switch'
                vertical
                reversed
                .checked=${light.isOn()}
                .showHandle=${!light.isUnavailable()}
                @change=${(ev: Event) => this.onSwitch(light, ev)}
                style=${styleMap(colors)}
                .disabled=${light.isUnavailable()}
            >
                <ha-icon icon="mdi:power-on" slot="icon-on"></ha-icon>
                <ha-icon icon="mdi:power-off" slot="icon-off"></ha-icon>
            </${unsafeStatic(HueBigSwitch.ElementName)}>
        `;
    }

    public override connectedCallback(): void {
        super.connectedCallback();

        if (this.areaController) {
            this.registerLightsPropertyChanged(this.areaController);
        }

        if (typeof ResizeObserver != 'undefined' && !this._resizeObserver) {
            this._resizeObserver = new ResizeObserver(() => this.updateSizes());
            this._resizeObserver.observe(this);
        }

        this.updateComplete.then(() => {
            if (!this._colorPicker) {
                this._colorPicker = <HueColorTempPicker>this.renderRoot.querySelector('.color-picker');
                this._lightMarkerManager = new LightMarkerManager(this._colorPicker, l => this.setLightContainerFromPicker(l));
                this.createAreaControllerMarkers();
            }

            // get mode-selector and give it colorPicker
            if (!this._modeSelector) {
                this._modeSelector = <HueColorTempModeSelector>this.renderRoot.querySelector('.mode-selector');
                this._modeSelector.colorPicker = this._colorPicker;
            }
        });
    }

    public override disconnectedCallback(): void {
        super.disconnectedCallback();

        if (this.areaController) {
            this.unregisterLightsPropertyChanged(this.areaController);
        }

        this._resizeObserver?.disconnect();
        this._resizeObserver = null;
    }

    /**
     * Sizes the square wheel area. It's the same for every kind of light, so switching lights never moves the layout.
     */
    private updateSizes(): void {
        const lights = this.areaController?.getLights() ?? [];
        const size = LightDetailLayout.wheelAreaSize(this.clientWidth, this.clientHeight, LightDetailLayout.showsTiles(lights.length));
        if (!size) // not rendered
            return;

        const sizePx = size + 'px';
        const area = this.renderRoot.querySelector<HTMLElement>('.wheel-area');
        if (area) {
            area.style.width = sizePx;
            area.style.height = sizePx;
        }

        const colorPicker = this.renderRoot.querySelector<HTMLElement>('.color-picker');
        if (colorPicker) {
            colorPicker.style.width = sizePx;
            colorPicker.style.height = sizePx;
        }

        const lightSwitch = this.renderRoot.querySelector<HTMLElement>('.light-switch');
        if (lightSwitch) {
            const widthPx = Math.max(60, size / 3) + 'px';
            lightSwitch.style.width = widthPx;
            lightSwitch.style.setProperty('--control-switch-thickness', widthPx);
            lightSwitch.style.height = sizePx;
        }
    }
}

export class LightMarkerManager {
    private static readonly MarkerOffColor = new Color(0, 0, 0);
    private static readonly MarkerUnavailableColor = new Color(102, 102, 102);

    private _markerToLight: Record<string, ISingleLightContainer>;
    private _lightToMarker: Record<string, HueColorTempPickerMarker>;
    private _picker: HueColorTempPicker;
    private _onMarkerActivation: Action1<ISingleLightContainer[]>;
    private _stateUpdateSuspended = false;
    private _selectedIds: string[] = [];

    public constructor(picker: HueColorTempPicker, onMarkerActivation: Action1<ISingleLightContainer[]>) {
        this._picker = picker;
        this._onMarkerActivation = onMarkerActivation;

        this._picker.addEventListener('activemarkers-change', _ => {
            const markers = this._picker.getActiveMarkers();
            const lights = markers.map(m => this.getLight(m)).filter(m => !!m);
            if (lights.length) {
                // could not resolve markers to lights - event fired probably after adding new marker
                this._onMarkerActivation(lights);
            }
        });

        this.clear();
    }

    public add(...lights: ISingleLightContainer[]) {
        lights.forEach(light => {
            // no marker for light without color/temp features
            if (light.features.isEmpty() || light.features.isOnlyBrightness())
                return;

            const marker = this._picker.addMarker(light.getEntityId());
            marker.icon = light.getIcon() || IconHelper.getIcon(1);

            // fixed mode for lights that supports only single mode
            if (!light.features.color && light.features.colorTemp) {
                marker.fixedMode = 'temp';
            }
            else if (light.features.color && !light.features.colorTemp) {
                marker.fixedMode = 'color';
            }

            this._markerToLight[marker.name] = light;
            this._lightToMarker[light.getEntityId()] = marker;

            this.applyState(light);
        });

        // try merge newly added markers
        this._picker.tryMergeMarkers();
    }

    public suspendStateUpdate(action: Action) {
        this._stateUpdateSuspended = true;
        try {
            action();
        }
        finally {
            this._stateUpdateSuspended = false;
        }
    }

    /** Will apply current light state to corresponding marker. */
    public applyState(light: ISingleLightContainer, mergingPossible = false) {
        if (this._stateUpdateSuspended)
            return;

        const marker = this.getMarker(light);
        if (!marker || marker.isDrag)
            return;

        let changed = false;

        if (light.isColorModeColor()) {
            changed = changed || marker.mode != 'color';
            if (light.color) {
                changed = changed || marker.color.toString() != light.color.toString();
                marker.color = light.color;
            }
        }
        else if (light.isColorModeTemp()) {
            changed = changed || marker.mode != 'temp';
            if (light.colorTemp) {
                changed = changed || marker.temp != light.colorTemp;
                marker.temp = light.colorTemp;
            }
        }

        // show marker as off
        marker.isOff = !light.isOn(); // unavailable state will be also off
        marker.offColor = light.isUnavailable() ? LightMarkerManager.MarkerUnavailableColor : LightMarkerManager.MarkerOffColor;
        this.applyVisibility(light, marker);

        // unmerge/remerge
        if (mergingPossible && !marker.isActive && changed) { // do not merge single active marker and merge only changed values
            if (this._picker.shouldUnmergeMarker(marker)) {
                this._picker.unmergeMarker(marker);
            }
            this._picker.tryMergeMarkers(marker);
        }
    }

    /**
     * Sets the lights selected on the screen; off lights only show their marker while selected.
     */
    public setSelected(entityIds: string[]) {
        this._selectedIds = entityIds;
        Object.values(this._markerToLight).forEach(light => {
            const marker = this.getMarker(light);
            if (marker) {
                this.applyVisibility(light, marker);
            }
        });
    }

    private applyVisibility(light: ISingleLightContainer, marker: HueColorTempPickerMarker) {
        // only the screen's selection counts: markers are also activated while being added, and an off one must stay hidden then
        const selected = LightDetailLayout.isSelected(light.getEntityId(), this._selectedIds);
        marker.hidden = !LightDetailLayout.markerVisible(light.isOn(), selected);
    }

    public getLight(marker: HueColorTempPickerMarker) {
        return this._markerToLight[marker.name];
    }

    public getMarker(light: ISingleLightContainer) {
        return this._lightToMarker[light.getEntityId()];
    }

    /** Will delete all items from this map. */
    public clear() {
        this._markerToLight = {};
        this._lightToMarker = {};
        this._picker.clearMarkers();
    }
}