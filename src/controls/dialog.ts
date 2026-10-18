import { css, nothing, PropertyValues, unsafeCSS } from 'lit';
import { html, unsafeStatic } from 'lit/static-html.js';
import { customElement, state } from 'lit/decorators.js';
import { classMap } from 'lit-html/directives/class-map.js';
import { Background } from '../core/colors/background';
import { Color } from '../core/colors/color';
import { DialogTint } from '../core/dialog-tint';
import { AreaLightController } from '../core/area-light-controller';
import { ViewUtils } from '../core/view-utils';
import { HueLikeLightCardConfig, HueLikeLightCardEntityConfigCollection } from '../types/config';
import { Consts } from '../types/consts';
import { HaDialog } from '../types/types-hass';
import { ThemeHelper } from '../types/theme-helper';
import { SceneConfig, SceneProvider } from '../types/types-config';
import { PresetConfig } from '../types/types-hue-preset';
import { HueDialogScenePresetTile } from './dialog-scene-preset-tile';
import { IdLitElement } from '../core/id-lit-element';
import { HueDialogLightTile, ILightSelectedEventDetail } from './dialog-light-tile';
import { ILightContainer } from '../types/types-interface';
import { ITileEventDetail } from './dialog-tile';
import { HueLightDetail } from './light-detail';
import { LightController } from '../core/light-controller';
import { HueHistoryStateManager, HueHistoryStep } from './history-state-manager';
import { localize } from '../localize/localize';
import { ActionHandler } from '../core/action-handler';
import { HueDialogSceneHATile } from './dialog-scene-ha-tile';
import { horizontalScroll } from '../directives/horizontal-scroll';
import { M3PageDots } from './m3-page-dots';
import { PageDotsMath } from '../core/page-dots-math';

@customElement(HueDialog.ElementName)
export class HueDialog extends IdLitElement {

    /**
     * Name of this Element
     */
    public static readonly ElementName = 'hue-dialog' + Consts.ElementPostfix;

    /*
    Doc:
    https://material-components.github.io/material-components-web-catalog/#/component/dialog
    */

    private _isRendered = false;
    private _config: HueLikeLightCardConfig;
    private _entitiesConfig: HueLikeLightCardEntityConfigCollection;
    private _ctrl: AreaLightController;
    private _actionHandler: ActionHandler;

    // #region selectedLights

    private readonly _selectedLights = new Array<ILightContainer>();

    /**
     * Will add light to collection of selected lights.
     */
    private setSelectedLights(...lights: ILightContainer[]) {
        this._selectedLights.length = 0;
        lights.forEach(l => this._selectedLights.push(l));
        this.requestUpdate('_selectedLights');
    }

    /**
     * Will remove all lights from collection of selected lights.
     */
    private clearSelectedLights() {
        this._selectedLights.length = 0;
        this.requestUpdate('_selectedLights');
    }

    private loadSelectedLights(detail: HueLightDetail) {
        const lights = detail.lightContainer?.getLights();
        if (lights) {
            this.setSelectedLights(...lights);
        }
    }

    // #endregion

    public constructor(config: HueLikeLightCardConfig, lightController: AreaLightController, actionHandler: ActionHandler) {
        super('HueDialog');

        this._config = config;
        this._entitiesConfig = config.getEntities();
        this._ctrl = lightController;
        this._actionHandler = actionHandler;
    }

    //#region Tile interactions

    // lightDetail as history step
    private _lightDetailHistoryStep: HueHistoryStep | undefined;

    /**
     * The lights section is hidden for a single light: the header switch already does its job (spec).
     */
    public static showsLightsSection(lightCount: number): boolean {
        return lightCount > 1;
    }

    private onLightSelected(ev: CustomEvent<ILightSelectedEventDetail>) {
        if (ev.detail.lightContainer) {
            this.openLightDetail(ev.detail.lightContainer);
        }
    }

    /**
     * Opens the light detail (color wheel) for given light, as a history step.
     */
    public openLightDetail(light: ILightContainer): void {
        const show = () => {
            this.setSelectedLights(light);

            if (this._lightDetailElement) {
                this._lightDetailElement.lightContainer = <LightController>light;
                this._lightDetailElement.show();
            }
        };
        const hide = () => {
            this.clearSelectedLights();

            // hide detail of selected light
            this._lightDetailElement?.hide();
        };

        this._lightDetailHistoryStep = new HueHistoryStep(show, hide, HueLightDetail.ElementName);
        HueHistoryStateManager.instance.addStep(this._lightDetailHistoryStep);
    }

    private onTitleKeyDown(ev: KeyboardEvent, light: ILightContainer) {
        if (ev.key == 'Enter' || ev.key == ' ') {
            ev.preventDefault();
            this.openLightDetail(light);
        }
    }

    private hideLightDetail() {
        // clear all selected lights
        this.clearSelectedLights();

        // hide with history
        if (this._lightDetailHistoryStep) {
            HueHistoryStateManager.instance.goBefore(this._lightDetailHistoryStep);
        }
    }

    private toggleUnderDetailControls(show: boolean) {
        const controls = this.renderRoot.querySelectorAll('.detail-hide');
        controls.forEach((el) => {
            el.classList.toggle('hue-hidden', show);
        });

        // the detail covers the whole content, so lock its scrolling at the top
        const dialogShadowRoot = this.shadowRoot?.querySelector('ha-dialog')?.shadowRoot;
        if (dialogShadowRoot) {
            const contentDiv = dialogShadowRoot.getElementById('content');
            if (contentDiv) {
                if (show) {
                    contentDiv.style.overflowY = 'hidden';
                    contentDiv.scrollTo({ top: 0 });
                }
                else {
                    contentDiv.style.overflowY = '';
                }
            }
        }
    }

    private afterSceneTileActivated(ev: CustomEvent<ITileEventDetail>) {
        // scroll to selected scene
        HueDialog.tileScrollTo(ev.detail.tileElement);
    }

    //#endregion

    //#region Tile-Scrollers

    @state()
    private _scenePageCount = 0;
    @state()
    private _scenePage = 0;

    private _sceneScroller: HTMLElement | null = null;
    private _sceneResizeObserver: ResizeObserver | null = null;
    private _sceneScrollFrame = 0;

    /** Hooks the page dots to the (re)rendered scene scroller. */
    private attachSceneScroller() {
        const scroller = this.renderRoot.querySelector<HTMLElement>('.scene-tiles');
        if (scroller == this._sceneScroller)
            return;

        this.detachSceneScroller();
        this._sceneScroller = scroller;
        if (!scroller)
            return;

        scroller.addEventListener('scroll', this.onSceneScroll, { passive: true });
        if (typeof ResizeObserver != 'undefined') {
            this._sceneResizeObserver = new ResizeObserver(() => this.updatePageDots());
            this._sceneResizeObserver.observe(scroller);
        }
        this.updatePageDots();
    }

    private detachSceneScroller() {
        this._sceneScroller?.removeEventListener('scroll', this.onSceneScroll);
        this._sceneResizeObserver?.disconnect();
        this._sceneResizeObserver = null;
        if (this._sceneScrollFrame) {
            cancelAnimationFrame(this._sceneScrollFrame);
            this._sceneScrollFrame = 0;
        }
        this._sceneScroller = null;
    }

    private onSceneScroll = () => {
        if (this._sceneScrollFrame)
            return;

        this._sceneScrollFrame = requestAnimationFrame(() => {
            this._sceneScrollFrame = 0;
            this.updatePageDots();
        });
    };

    private updatePageDots() {
        const s = this._sceneScroller;
        if (!s)
            return;

        const count = PageDotsMath.pageCount(s.scrollWidth, s.clientWidth);
        const page = PageDotsMath.currentPage(s.scrollLeft, s.scrollWidth, s.clientWidth);
        if (count != this._scenePageCount)
            this._scenePageCount = count;
        if (page != this._scenePage)
            this._scenePage = page;
    }

    private onScenePageSelect(ev: CustomEvent<{ page: number }>) {
        const s = this._sceneScroller;
        if (!s)
            return;

        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        s.scrollTo({
            left: PageDotsMath.pageScrollLeft(ev.detail.page, s.scrollWidth, s.clientWidth),
            behavior: reducedMotion ? 'auto' : 'smooth'
        });
    }

    private static tileScrollTo(el: HTMLElement) {
        if (!el)
            return;

        const tileScroller = <HTMLElement>el.closest('.tile-scroller');
        if (tileScroller == null)
            throw Error('Parent tile-scroller not found.');

        // get tile scroller bounds
        const tileScrollerStart = tileScroller.offsetLeft + tileScroller.scrollLeft;
        const tileScrollerEnd = tileScroller.clientWidth + tileScrollerStart;

        const minSpace = 10; // reasonable space before/after the element
        const elStart = el.offsetLeft - minSpace;
        const elEnd = el.offsetLeft + el.clientWidth + minSpace;

        // is reasonably visible?
        const isBefore = elStart < tileScrollerStart;
        const isAfter = elEnd > tileScrollerEnd;

        // if is inside or is outside on both sides (fail) - no scroll
        if (isBefore == isAfter)
            return;

        if (isBefore) {
            tileScroller.scrollBy({ left: elStart - tileScrollerStart, behavior: 'smooth' });
        }
        else {
            tileScroller.scrollBy({ left: elEnd - tileScrollerEnd, behavior: 'smooth' });
        }
    }

    //#endregion

    //#region show/hide

    private _historyStep: HueHistoryStep | undefined;

    /**
     * Insert and renders this dialog into <home-assistant>.
     */
    public show(): void {
        if (this._isRendered)
            throw new Error('Already rendered!');

        // open with history
        this._historyStep = new HueHistoryStep(
            () => this.showInternal(),
            () => this.close(),
            HueDialog.ElementName
        );
        HueHistoryStateManager.instance.addStep(this._historyStep);
    }

    private showInternal() {
        this._isRendered = true;

        // try to render ha-dialog as open
        const haDialog = this.getDialogElement();
        if (haDialog) {
            haDialog.open = true;
        }

        // append to DOM
        const haDom = document.getElementsByTagName('home-assistant');
        const haRoot = haDom.length ? haDom[0].shadowRoot : null;
        if (haRoot) {
            haRoot.appendChild(this);
        }
        else {
            document.body.appendChild(this);
        }

        // register update delegate (include hass - we need to update the dialog)
        this._ctrl.registerOnPropertyChanged(this._elementId, this.onChangeHandler, /* includeHass: */ true);
    }

    public close(): void {
        if (!this._isRendered)
            return;

        // try to find dialog
        const haDialog = this.getDialogElement();
        if (haDialog) {
            // if dialog closed - will call onDialogClose event
            haDialog.close();
        }
        else {
            // no haDialog found - use legacy way
            this.onDialogClose();
        }
    }

    private getDialogElement(): HaDialog | null {
        if (!this._isRendered || !this.renderRoot)
            return null;

        return this.renderRoot.querySelector('ha-dialog');
    }

    /** When the dialog is closed. Removes itself from the DOM. */
    private onDialogClose() {
        this.detachSceneScroller();

        if (this._isRendered) {
            this.remove();

            // unregister update delegate
            this._ctrl.unregisterOnPropertyChanged(this._elementId);

            this._isRendered = false;
        }

        // go back in history
        if (this._historyStep) {
            HueHistoryStateManager.instance.goBefore(this._historyStep);
        }
    }

    //#endregion

    /**
     * Default ha-dialog styles from HA.
     * See https://github.com/home-assistant/frontend/blob/dev/src/resources/styles.ts
     */
    private static readonly haStyleDialog = css`
  ha-dialog,
  ha-adaptive-dialog {
    /* M3 dialog: max 560px wide, extra-large corners (hueBorders sets --hue-dialog-radius) */
    --ha-dialog-width-md: 560px;
    --ha-dialog-border-radius: var(--hue-dialog-radius, var(--md-sys-shape-corner-extra-large, 28px));
    --justify-action-buttons: space-between;
    --dialog-container-padding: var(--safe-area-inset-top, 0)
      var(--safe-area-inset-right, 0) var(--safe-area-inset-bottom, 0)
      var(--safe-area-inset-left, 0);
    --dialog-surface-padding: 0px;
  }

  ha-dialog .form,
  ha-adaptive-dialog .form {
    color: var(--primary-text-color);
  }

  a {
    color: var(--primary-color);
  }

  /* make dialog fullscreen on small screens */
  @media all and (max-width: 450px), all and (max-height: 500px) {
    ha-dialog,
    ha-adaptive-dialog {
      --mdc-dialog-min-width: 100vw;
      --mdc-dialog-max-width: 100vw;
      --mdc-dialog-min-height: 100vh;
      --mdc-dialog-min-height: 100svh;
      --mdc-dialog-max-height: 100vh;
      --mdc-dialog-max-height: 100svh;
      --dialog-container-padding: 0px;
      --dialog-surface-padding: var(--safe-area-inset-top, 0)
        var(--safe-area-inset-right, 0) var(--safe-area-inset-bottom, 0)
        var(--safe-area-inset-left, 0);
      --vertical-align-dialog: flex-end;
    }
    ha-dialog {
      --ha-dialog-border-radius: var(--ha-border-radius-square);
    }
  }
  .error {
    color: var(--error-color);
  }
`;

    private static readonly headerMargin = 8;
    private static readonly tileGap = 8;
    private static readonly haPadding = 24;

    public static override get styles() {
        return [
            HueDialog.haStyleDialog,
            css`
    /* hiding controls when light detail is open */
    .detail-hide {
        transition:${unsafeCSS(Consts.TransitionDefault)};
    }

    .hue-hidden {
        opacity: 0;
        pointer-events: none;
    }

    /* header sits on the dialog surface (the glow is drawn behind it) */
    .hue-heading {
        --hue-heading-text-color: var(--hue-text-color, ${unsafeCSS(Consts.TintOnSurfaceCss)});

        background: transparent;
        transition:${unsafeCSS(Consts.TransitionDefault)};

        /* HA will show bottom border when scrolled down */
        border-bottom-width: 0;

        /* is above the backdrop */
        z-index:1;
    }
    .hue-heading ha-icon-button,
    .hue-heading .main-title {
        color:var(--hue-heading-text-color);
    }
    .hue-heading ha-icon-button {
        /* the close button otherwise picks up the theme accent */
        --icon-primary-color: var(--hue-heading-text-color);
        --wa-color-on-normal: var(--hue-heading-text-color);
    }
    .hue-heading ha-icon-button ha-icon {
        color: var(--hue-heading-text-color);
    }
    .hue-heading .main-title {
        /* M3 headline-small */
        font-size: var(--md-sys-typescale-headline-small-size, 24px);
        line-height: var(--md-sys-typescale-headline-small-line-height, 32px);
        font-weight: var(--md-sys-typescale-headline-small-weight, 400);
    }
    ha-dialog-header {
        --mdc-theme-on-primary: var(--hue-heading-text-color);
        --mdc-theme-primary: transparent;
        flex-shrink: 0;
        display: block;
    }
    .hue-heading .m3-switch {
        margin-inline-end: 12px;
    }
    .hue-heading .m3-switch.tinted {
        /* on a lit dialog: track in the readable foreground color, handle in the surface color behind it */
        --m3-switch-selected-track: var(--hue-heading-text-color);
        --m3-switch-selected-handle: var(--hue-switch-handle-color);
        --m3-switch-unselected-track: transparent;
        --m3-switch-unselected-outline: var(--hue-heading-text-color);
        --m3-switch-unselected-handle: var(--hue-heading-text-color);
    }
    .hue-heading .brightness-slider {
        padding: 0 18px 6px;
    }
    .hue-heading .brightness-slider.tinted {
        --m3-slider-active-color: var(--hue-heading-text-color);
        --m3-slider-inactive-color: color-mix(in srgb, var(--hue-heading-text-color) 24%, transparent);
        --m3-slider-stop-color: color-mix(in srgb, var(--hue-heading-text-color) 60%, transparent);
    }
    /* Disable the bottom border radius */
    /* in default styles: --ha-border-radius=0 in this case */
    /*
    @media all and (max-width: 450px), all and (max-height: 500px) {
        border-bottom-left-radius: none;
        border-bottom-right-radius: none;
        padding-bottom: none;
    }
    */

    /* titles */
    .header{
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0;
    }
    .header .title{
        /* M3 label-medium */
        color: var(--md-sys-color-on-surface-variant, ${unsafeCSS(Consts.ThemeSecondaryTextColorVar)});
        font-size: var(--md-sys-typescale-label-medium-size, 12px);
        line-height: var(--md-sys-typescale-label-medium-line-height, 16px);
        font-weight: var(--md-sys-typescale-label-medium-weight, 500);
        letter-spacing: var(--md-sys-typescale-label-medium-tracking, 0.5px);
    }

    .content {
        outline: none;
        padding-top: var(--ha-space-6);
    }

    /* tiles - scenes, lights */
    .tile-scroller {
        display: flex;
        flex-flow: column;
        /*gap: ${HueDialog.tileGap}px;*/
        max-width: 100%;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 0 ${HueDialog.haPadding}px;
        margin: 0 -${HueDialog.haPadding}px;
    }
    /* the page dots replace the scrollbar */
    .tile-scroller {
        scrollbar-width: none;
    }
    .tile-scroller::-webkit-scrollbar {
        display: none;
    }

    .tiles {
        display: flex;
        flex-flow: row;
        gap: ${HueDialog.tileGap}px;
        margin-bottom: ${HueDialog.tileGap}px;
    }
    .tile-scroller .tiles:first-child{
        margin-top: ${HueDialog.headerMargin}px;
    }
    .tiles::after {
        /* Flex loosing right padding, when overflowing */
        content: '';
        min-width: ${HueDialog.haPadding - HueDialog.tileGap}px;
    }

    /* Scene tiles */
    .tile-scroller.scene-tiles{
        min-height: 100px;
    }
    .scene-dots {
        --m3-page-dots-active-color: var(--hue-text-color, ${unsafeCSS(Consts.TintOnSurfaceCss)});
        margin-bottom: 4px;
    }

    /* Light rows (grouped M3 list) */
    .light-rows {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin: ${HueDialog.headerMargin}px 0 ${HueDialog.tileGap}px;
    }

    /* single light: the title opens the color wheel */
    .main-title.opens-detail {
        cursor: pointer;
    }
    .main-title.opens-detail:focus-visible {
        outline: 2px solid var(--hue-heading-text-color);
        outline-offset: 2px;
        border-radius: 4px;
    }
    `];
    }

    private _backdropSet = false;
    private _lightDetailElement: HueLightDetail | null = null;

    private tryCreateBackdropAndLightDetail(throwError = false) {
        // Glow of the light colors behind the header, fading out partway down the scenes
        if (!this._backdropSet || !this._lightDetailElement) {

            // Trying to find surface element (it's not available during first load)
            const dialogShadowRoot = this.shadowRoot?.querySelector('ha-dialog')?.shadowRoot;
            const surface = dialogShadowRoot && <HTMLElement>dialogShadowRoot.querySelector('wa-dialog');

            // finally got surface element, let's create backdrop and other stuff
            if (surface) {

                if (!this._backdropSet) {
                    const backdropElement = document.createElement('div');
                    backdropElement.id = 'hue-backdrop';
                    backdropElement.style.position = 'absolute';
                    backdropElement.style.width = '100%';
                    backdropElement.style.height = '100%';
                    backdropElement.style.borderRadius = 'var(--ha-dialog-border-radius, 28px)'; // same as dialog
                    backdropElement.style.background = 'var(--hue-glow-background, transparent)';
                    backdropElement.style.opacity = 'var(--hue-glow-opacity, 0)';
                    backdropElement.style.pointerEvents = 'none';
                    backdropElement.style.transition = Consts.TransitionDefault;

                    const mask = 'radial-gradient(120% 60% at 50% 0%, #000 0%, rgba(0, 0, 0, .45) 45%, transparent 80%)';
                    backdropElement.style.mask = mask;
                    backdropElement.style.webkitMask = mask;
                    //backdropElement.style.zIndex = '0';

                    // if the browser doesn't support mask - don't render the backdrop element
                    if (backdropElement.style.mask || backdropElement.style.webkitMask) {
                        surface.prepend(backdropElement);
                    }

                    this._backdropSet = true;
                }

                if (!this._lightDetailElement) {
                    const detailElement = new HueLightDetail();
                    detailElement.style.position = 'absolute';
                    detailElement.style.width = '100%';
                    detailElement.style.height = '100%';
                    detailElement.style.zIndex = '2'; // over header

                    detailElement.areaController = this._ctrl;

                    // action for show and hide
                    detailElement.addEventListener('show', () => {
                        this.toggleUnderDetailControls(true);
                    });
                    detailElement.addEventListener('hide', () => {
                        this.toggleUnderDetailControls(false);
                        this.hideLightDetail();
                    });
                    // when lightContainer changes from picker
                    detailElement.addEventListener('lightcontainer-change', () => {
                        this.loadSelectedLights(detailElement);
                    });

                    surface.prepend(detailElement);

                    this._lightDetailElement = detailElement;
                }
            }
            else if (throwError) {
                throw new Error('Cannot create backdrop and lightDetail. Surface not found.');
            }
        }
    }

    /** Whether updateStylesInner overrode the content text colors (so it only removes its own values). */
    private _contentColorsSet = false;

    // Can't be named 'updateStyles', because HA searches for that method and calls it instead of applying theme
    private updateStylesInner(isFirst: boolean): void {
        const screenBgColor = this._config.getHueScreenBgColor();
        const offColor = this._config.getOffColor();
        const useScreenBgColor = this._config.wasHueScreenBgColorSet;
        const useOffColor = this._ctrl.isOff() && this._config.wasOffColorSet && !offColor.isThemeColor();

        if (isFirst) {
            // apply theme
            ThemeHelper.applyTheme(this, this._ctrl.hass.themes, this._config.theme);

            // To help change themes on the fly
            ThemeHelper.setDialogThemeStyles(this, '--hue-screen-background', useScreenBgColor && screenBgColor.isThemeColor());
        }

        if (this._config.hueBorders) {
            this.style.setProperty('--hue-dialog-radius', Consts.HueBorderRadius + 'px');
        }

        // ## Base surface and foreground (spec: lightly harmonized surface, the glow carries most of the color)
        const surface = ThemeHelper.getTintSurface(this);
        const defaultColorBg = new Background([this._config.getDefaultColor()]);

        // base: the actual color (when known) used to keep the glow readable
        let base: Color | null = null;
        let baseCss: string;
        if (useScreenBgColor || useOffColor) {
            const color = useOffColor ? offColor : screenBgColor;
            if (color.isThemeColor()) {
                baseCss = Consts.ThemeCardBackgroundVar;
            }
            else {
                base = color.getBaseColor();
                baseCss = base.toString();
            }
        }
        else if (this._ctrl.isOn() && surface) {
            const bfg = ViewUtils.calculateBackAndForeground(this._ctrl, null, false, defaultColorBg, surface, Consts.DialogBaseTintFactor);
            base = bfg.background ? DialogTint.averageColor(bfg.background) : surface;
            baseCss = base.toString();
        }
        else {
            base = surface;
            baseCss = Consts.TintSurfaceCss;
        }

        const foreground = base ? DialogTint.foregroundFor(base) : null;
        this.style.setProperty('--hue-screen-background', baseCss);
        this.style.setProperty('--hue-switch-handle-color', baseCss);

        // an explicit surface (hueScreenBgColor / offColor) needs matching content text, not the theme's
        const explicitBase = (useScreenBgColor || useOffColor) && foreground != null;
        if (explicitBase) {
            const content = DialogTint.contentColors(foreground);
            this.style.setProperty('--md-sys-color-on-surface', content.onSurface);
            this.style.setProperty('--md-sys-color-on-surface-variant', content.onSurfaceVariant);
            this.style.setProperty('--secondary-text-color', content.onSurfaceVariant);
            this._contentColorsSet = true;
        }
        else if (this._contentColorsSet) {
            this.style.removeProperty('--md-sys-color-on-surface');
            this.style.removeProperty('--md-sys-color-on-surface-variant');
            this.style.removeProperty('--secondary-text-color');
            this._contentColorsSet = false;
        }
        if (foreground && (useScreenBgColor || useOffColor || this._ctrl.isOn())) {
            this.style.setProperty('--hue-text-color', foreground.toString());
            this.style.setProperty('--primary-text-color', foreground.toString());
        }
        else {
            this.style.setProperty('--hue-text-color', Consts.TintOnSurfaceCss);
            this.style.removeProperty('--primary-text-color');
        }

        // ## Glow
        if (this._ctrl.isOn()) {
            const lights = this._ctrl.getBackground() || defaultColorBg;
            const glow = DialogTint.glowBackground(lights, surface, this._config.tint);
            let opacity = DialogTint.glowOpacity(this._ctrl.brightnessValue, this._config.tint, surface);

            // keep the text readable where the glow is strongest; an unparseable surface may be light or dark
            opacity = base && foreground
                ? DialogTint.readableGlowOpacity(base, glow, foreground, opacity)
                : DialogTint.readableGlowOpacityUnknownBase(glow, opacity);

            this.style.setProperty('--hue-glow-background', glow.toString());
            this.style.setProperty('--hue-glow-opacity', opacity.toString());
        }
        else {
            // keep the last glow colors, so it fades out
            this.style.setProperty('--hue-glow-opacity', '0');
        }
    }

    private onChangeHandler = () => this.onChangeCallback();
    private onChangeCallback() {
        this.requestUpdate();
        this.updateStylesInner(false);
    }

    protected override render() {
        this._isRendered = true;

        // inspiration: https://github.com/home-assistant/frontend/blob/dev/src/dialogs/more-info/ha-more-info-dialog.ts

        const cardTitle = this._config.getTitle(this._ctrl).resolveToString(this._ctrl.hass);
        const lights = this._ctrl.getLights();
        const singleLight = !HueDialog.showsLightsSection(lights.length) && lights.length == 1 ? lights[0] : null;
        const mdiClose = 'mdi:close';
        const sceneTiles: ({ kind: 'scene', config: SceneConfig } | { kind: 'preset', config: PresetConfig })[] = [];
        this._config.sceneProvider.forEach(provider => {
            if (provider == SceneProvider.HaScenes) {
                sceneTiles.push(...this._config.scenes.map(sceneConfig => ({ kind: 'scene' as const, config: sceneConfig })));
            }
            else if (provider == SceneProvider.ScenePresets) {
                sceneTiles.push(...this._config.presets.map(presetConfig => ({ kind: 'preset' as const, config: presetConfig })));
            }
        });

        const renderSceneTile = (tile: { kind: 'scene', config: SceneConfig } | { kind: 'preset', config: PresetConfig }) => {
            if (tile.kind === 'scene') {
                return html`<${unsafeStatic(HueDialogSceneHATile.ElementName)}
                                .cardTitle=${cardTitle}
                                .sceneConfig=${tile.config}
                                @activated=${(e: CustomEvent) => this.afterSceneTileActivated(e)}
                                .hass=${this._ctrl.hass}
                                .actionHandler=${this._actionHandler}>
                            </${unsafeStatic(HueDialogSceneHATile.ElementName)}>`;
            }
            else if (tile.kind === 'preset') {
                return html`<${unsafeStatic(HueDialogScenePresetTile.ElementName)}
                                .presetConfig=${tile.config}
                                .targets=${this._config.getPresetTargets()}
                                @activated=${(e: CustomEvent) => this.afterSceneTileActivated(e)}
                                .hass=${this._ctrl.hass}
                                .actionHandler=${this._actionHandler}>
                            </${unsafeStatic(HueDialogScenePresetTile.ElementName)}>`;
            } 

            return nothing;
        };

        /*eslint-disable */
        return html`
        <ha-dialog
          open
          @closed=${() => this.onDialogClose()}
          .heading=${cardTitle}
          hideActions
        >
          <ha-dialog-header slot="header" class="hue-heading detail-hide">
            <ha-icon-button
              slot="navigationIcon"
              data-dialog="close"
              dialogAction="cancel"
            >
              <ha-icon
                icon=${mdiClose}
                style="height:auto"
              >
              </ha-icon>
            </ha-icon-button>
            ${singleLight
              ? html`<div
                  slot="title"
                  class="main-title opens-detail"
                  .title=${cardTitle}
                  role="button"
                  tabindex="0"
                  @click=${() => this.openLightDetail(singleLight)}
                  @keydown=${(e: KeyboardEvent) => this.onTitleKeyDown(e, singleLight)}
                >
                  ${cardTitle}
                </div>`
              : html`<div
                  slot="title"
                  class="main-title"
                  .title=${cardTitle}
                >
                  ${cardTitle}
                </div>`}
            <div slot="actionItems">
              ${ViewUtils.createM3Switch(this._ctrl, this.onChangeHandler, this._config.switchOnScene)}
            </div>
            ${ViewUtils.createSlider(this._ctrl, this._config, this.onChangeHandler)}
          </ha-dialog-header>
          <div class="${classMap({
            'content': true,
            'detail-active': !!this._selectedLights.length
        })}" tabindex="-1" dialogInitialFocus>
            ${sceneTiles.length ? html`
            <div class='header detail-hide'>
                <div class='title'>${localize(this._ctrl.hass, "dialog.scenes")}</div>
            </div>
            <div class='tile-scroller scene-tiles detail-hide' ${horizontalScroll()}>
                <div class='tiles'>
                    ${(sceneTiles.map((tile, i) => i % 2 == 1 ? nothing : renderSceneTile(tile)))}
                </div>
                <div class='tiles'>
                    ${(sceneTiles.map((tile, i) => i % 2 == 0 ? nothing : renderSceneTile(tile)))}
                </div>
            </div>
            <${unsafeStatic(M3PageDots.ElementName)}
                class='scene-dots detail-hide'
                .count=${this._scenePageCount}
                .current=${this._scenePage}
                .labelFormat=${localize(this._ctrl.hass, "dialog.page")}
                @page-select=${(e: CustomEvent<{ page: number }>) => this.onScenePageSelect(e)}>
            </${unsafeStatic(M3PageDots.ElementName)}>
            ` : nothing}

            ${HueDialog.showsLightsSection(lights.length) ? html`
            <div class='header detail-hide'>
                <div class='title'>${localize(this._ctrl.hass, "dialog.lights")}</div>
            </div>
            <div class='light-rows detail-hide'>
                ${(lights.map((l) =>
                html`<${unsafeStatic(HueDialogLightTile.ElementName)}
                        .cardTitle=${cardTitle}
                        .lightContainer=${l}
                        .entityConfig=${this._entitiesConfig.getConfig(l.getEntityId())}
                        @selected-change=${(e: CustomEvent<ILightSelectedEventDetail>) => this.onLightSelected(e)}
                        .defaultColor=${this._config.getDefaultColor()}
                        .hass=${this._ctrl.hass}
                        .actionHandler=${this._actionHandler}>
                    </${unsafeStatic(HueDialogLightTile.ElementName)}>`))}
            </div>
            ` : nothing}
          </div>
        </ha-dialog>
        `;
        /*eslint-enable */
    }

    //#region updateStyles hooks

    protected override updated(changedProps: PropertyValues): void {
        super.updated(changedProps);

        this.updateStylesInner(false);
        this.attachSceneScroller();
    }

    public override connectedCallback(): void {
        super.connectedCallback();

        this.updateComplete.then(() => {
            this.tryCreateBackdropAndLightDetail(true);
            this.updateStylesInner(true);
        });
    }

    //#endregion
}
