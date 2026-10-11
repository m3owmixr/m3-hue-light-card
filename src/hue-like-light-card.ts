import { LovelaceCard, HomeAssistant, LovelaceCardConfig } from 'custom-card-helpers';
import { css, html, nothing, unsafeCSS, PropertyValues } from 'lit';
import { classMap } from 'lit-html/directives/class-map.js';
import { customElement } from 'lit/decorators.js';
import { ActionHandler } from './core/action-handler';
import { Background } from './core/colors/background';
import { AreaLightController } from './core/area-light-controller';
import { ViewUtils } from './core/view-utils';
import { HueLikeLightCardConfig } from './types/config';
import { Consts } from './types/consts';
import { nameof } from './types/extensions';
import { ThemeHelper } from './types/theme-helper';
import { IHassWindow } from './types/types-hass';
import { HueLikeLightCardConfigInterface, KnownIconSize } from './types/types-config';
import { ErrorInfo } from './core/error-info';
import { Action, AsyncAction } from './types/functions';
import { VersionNotifier } from './version-notifier';
import { Manager, Press, Tap } from '@egjs/hammerjs';
import { PreventGhostClick } from './types/prevent-ghostclick';
import { IdLitElement } from './core/id-lit-element';
import { HueApiProvider } from './core/api-provider';
import { ICardApi } from './types/types-api';
import { LimitedTimeout } from './core/limited-timeout';

// Show version info in console
VersionNotifier.toConsole();

// This puts card into the UI card picker dialog
(window as IHassWindow).customCards = (window as IHassWindow).customCards || [];
(window as IHassWindow).customCards!.push({
    type: Consts.CardElementName,
    name: Consts.CardName,
    description: Consts.CardDescription
});

@customElement(Consts.CardElementName)
export class HueLikeLightCard extends IdLitElement implements LovelaceCard {
    private readonly _lt: LimitedTimeout = new LimitedTimeout(20);
    private _config?: HueLikeLightCardConfig;
    private _hass?: HomeAssistant;
    private _ctrl?: AreaLightController;
    private _ctrlListenerRegistered = false;
    private _actionHandler?: ActionHandler;
    private _error?: ErrorInfo;
    private _mc?: HammerManager;
    private _gc?: PreventGhostClick;
    private _apiUnregister?: Action;

    public constructor() {
        super('HueLikeLightCard');
    }

    /**
     * Off background color.
     * Null for theme color.
     */
    private _offBackground: Background | null;

    public set hass(hass: HomeAssistant | undefined) {
        if (!hass)
            return;

        const oldHass = this._hass;
        this._hass = hass; // save hass instance

        // set hass instance where needed
        this.trySetHassWhereNeeded();

        // custom @property() implementation
        this.requestUpdate(nameof(this, 'hass'), oldHass);
    }
    public get hass() {
        return this._hass;
    }

    private catchErrors(action: Action | AsyncAction) {
        const catchRoutine = (e: unknown) => {
            this._error = new ErrorInfo(e);
            this.requestUpdate(); // render error

            // rethrow
            throw e;
        };

        try {
            this._error = undefined;

            if (action.constructor.name === 'AsyncFunction') {
                (action as AsyncAction)().catch(catchRoutine);
            }
            else {
                action();
            }
        }
        catch (e) {
            catchRoutine(e);
        }
    }

    public setConfig(plainConfig: HueLikeLightCardConfigInterface | LovelaceCardConfig) {
        this.catchErrors(() => {
            const oldConfig = this._config;
            this._config = new HueLikeLightCardConfig(<HueLikeLightCardConfigInterface>plainConfig);

            if (this._config.isInitialized) {
                this.useInitializedConfig(oldConfig);
            }
            else {
                this._oldConfig = oldConfig;
                this._configInitPending = true;
                // try to call init immediately (if hass is present)
                this.tryInitializeConfig(this.hass);
            }
        });
    }

    private _oldConfig?: HueLikeLightCardConfig;
    private _configInitPending = false;

    private tryInitializeConfig(hass: HomeAssistant | undefined) {
        if (!hass || !this._configInitPending)
            return;

        const oldConfig = this._oldConfig;

        // no longer pending
        this._configInitPending = false;
        this._oldConfig = undefined;

        this.catchErrors(async () => {
            // try to init the config
            await this._config!.init(hass);

            // if it ended up well, use the initialized config
            this.useInitializedConfig(oldConfig);
        });
    }

    private useInitializedConfig(oldConfig: HueLikeLightCardConfig | undefined) {
        if (this._config?.isInitialized != true)
            throw new Error('Config is not initialized.');

        this._ctrl = new AreaLightController(this._config.getEntities().getIdList(), this._config.getDefaultColor(), this._config.groupEntity);
        this._actionHandler = new ActionHandler(this._config, this._ctrl, this);

        // For theme color set background to null
        const offColor = this._config.getOffColor();
        if (!offColor.isThemeColor()) {
            this._offBackground = new Background([offColor.getBaseColor()]);
        }
        else {
            this._offBackground = null;
        }

        this._error = undefined;

        // try set hass
        this.trySetHassWhereNeeded();

        // custom @property() implementation
        this.requestUpdate('_config', oldConfig);
    }

    /** Will try to set Hass to lightController (will not fail if no lightController exists) */
    private trySetHassWhereNeeded() {
        if (!this.hass)
            return;

        // try to init config, if needed
        this.tryInitializeConfig(this.hass);

        // pass hass instance to Controller
        if (this._ctrl) {
            this._ctrl.hass = this.hass;
        }
    }

    /*
     * Gets or sets whether the card is in edit mode (in place editor or dialog editor). 
     */
    public editMode?: boolean;

    /**
     * Returns actual edit mode of the card.
     */
    private getEditMode() {
        if (!this.editMode)
            return null;

        if (this.parentElement?.tagName.toLowerCase() == 'hui-card-preview') {
            return 'editor';
        }

        return 'inplace';
    }

    // The height of your card. Home Assistant uses this to automatically
    // distribute all cards over the available columns.
    public getCardSize(): number {
        return 3;
    }

    private cardClicked(): void {
        // handle the click
        if (this._actionHandler) {
            this._actionHandler.handleCardClick();
        }

        // update styles
        this.updateStylesInner();
    }

    private cardHolded(): void {
        // handle the hold
        if (this._actionHandler) {
            this._actionHandler.handleCardHold();
        }

        // update styles
        this.updateStylesInner();
    }

    // #### UI:

    public static override styles = css`
    ha-card
    {
        background:var(--hue-background);
        position:relative;
        box-shadow:var(--hue-box-shadow), var(--ha-default-shadow);
        background-origin: border-box;
        /* M3 extra-large shape */
        border-radius: var(--md-sys-shape-corner-extra-large, 28px);
        --hue-card-margin: 16px;
    }
    ha-card.new-borders
    {
        /* since HA 2022.11 */
        box-shadow:var(--hue-box-shadow);
    }
    ha-card.hue-borders
    {
        border-radius:${Consts.HueBorderRadius}px;
        box-shadow:var(--hue-box-shadow), ${unsafeCSS(Consts.HueShadow)};
        border:none;
    }
    ha-card div.main-info
    {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--hue-card-margin);
    }
    ha-card div.tap-area
    {
        flex-grow:1;
        min-width: 0;
        min-height: 40px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 16px;
    }
    ha-icon
    {
        /* 40px tonal container (M3 list-item leading element), 24px glyph at the default icon size */
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        --mdc-icon-size: calc(24px * var(--hue-icon-size, ${Consts.IconSize[KnownIconSize.Original]}) / ${Consts.IconSize[KnownIconSize.Original]});
        color:var(--hue-text-color);
        background: color-mix(in srgb, var(--hue-text-color) 12%, transparent);
        transition:${unsafeCSS(Consts.TransitionDefault)};
    }
    .text-area{
        flex-grow: 1;
        min-width: 0;
        margin-right: 12px;
        color:var(--hue-text-color);
        transition:${unsafeCSS(Consts.TransitionDefault)};
    }
    .text-area.no-switch{
        margin-right: 0;
    }
    .text-area h2
    {
        /* M3 title-medium */
        font-size: var(--md-sys-typescale-title-medium-size, 16px);
        line-height: var(--md-sys-typescale-title-medium-line-height, 24px);
        font-weight: var(--md-sys-typescale-title-medium-weight, 500);
        letter-spacing: var(--md-sys-typescale-title-medium-tracking, 0.15px);
        text-overflow:ellipsis;
        overflow:hidden;
        white-space:nowrap;
        margin: 0;
    }
    .text-area .desc
    {
        /* M3 body-medium */
        font-size: var(--md-sys-typescale-body-medium-size, 14px);
        line-height: var(--md-sys-typescale-body-medium-line-height, 20px);
        font-weight: var(--md-sys-typescale-body-medium-weight, 400);
        opacity: 0.8;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        overflow: hidden;
    }
    .m3-switch.tinted
    {
        /* on a lit card: track in the readable foreground color, handle in the card's own color behind it */
        --m3-switch-selected-track: var(--hue-text-color);
        --m3-switch-selected-handle: var(--hue-switch-handle-color);
        --m3-switch-unselected-track: transparent;
        --m3-switch-unselected-outline: var(--hue-text-color);
        --m3-switch-unselected-handle: var(--hue-text-color);
    }
    .brightness-slider
    {
        /* 8px below the 48px row leaves 24px above and below the 16px track, with the handle ~10px clear of the rounded corners.
           padding, not margin: a bottom margin collapses through ha-card when it has no border */
        padding: 0 var(--hue-card-margin) 8px;
        /* main-info already has full bottom padding; pull the slider up to leave an 8px gap */
        margin-top: calc(8px - var(--hue-card-margin));
    }
    .brightness-slider.tinted
    {
        /* on a lit card the slider uses the card's readable foreground color, not the theme accent */
        --m3-slider-active-color: var(--hue-text-color);
        --m3-slider-inactive-color: color-mix(in srgb, var(--hue-text-color) 24%, transparent);
        --m3-slider-stop-color: color-mix(in srgb, var(--hue-text-color) 60%, transparent);
    }
    ha-alert{
        display:flex;
        overflow:auto;
    }
    `;

    protected override updated(changedProps: PropertyValues): void {
        super.updated(changedProps);
        this.setupListeners();
        this.updateStylesInner();

        if (!this._config || !this.hass) {
            return;
        }

        const oldHass = changedProps.get('hass') as HomeAssistant | undefined;
        const oldConfig = changedProps.get('_config') as HueLikeLightCardConfig | undefined;

        if (!oldHass || !oldConfig || oldHass.themes !== this.hass.themes || oldConfig.theme !== this._config.theme) {

            // Try apply theme
            if (ThemeHelper.applyTheme(this, this.hass.themes, this._config.theme)) {
                // Update styles - when theme changes
                this.updateStylesInner(true);
            }
        }
    }

    private _haShadow: string | null;
    private _switchColorDetected = false;

    // Can't be named 'updateStyles', because HA searches for that method and calls it instead of applying theme
    private updateStylesInner(forceRefresh = false): void {
        // no config or controller, do nothing
        if (!this._config || !this._ctrl)
            return;

        if (!this._switchColorDetected) {
            // Detect switch colors
            if (this._config.showSwitch) {
                ThemeHelper.detectSwitchColors(this);
            }
            this._switchColorDetected = true;
        }

        const card = <HTMLElement>this.renderRoot.querySelector('ha-card');

        // get defaultShadow (when not using hueBorders)
        if (!this._config.hueBorders && (this._haShadow == null || forceRefresh)) {

            // get default haShadow
            const c = document.createElement('ha-card');
            document.body.appendChild(c);
            const s = getComputedStyle(c);
            this._haShadow = s.boxShadow;
            c.remove();

            if (this._haShadow == 'none') {
                if (card == null) {
                    // wait for card element
                    this._haShadow = null;
                }
                else {
                    // since HA 2022.11 default ha-card has no shadow
                    card.classList.add('new-borders');
                }
            }

            // set default shadow property
            this.style.setProperty(
                '--ha-default-shadow',
                this._haShadow
            );
        }

        // Set icon size
        this.style.setProperty(
            '--hue-icon-size',
            this._config.iconSize.toString()
        );

        // Detect theme color if needed
        if (this._offBackground == null) {
            ThemeHelper.detectThemeCardBackground(this, forceRefresh);
        }

        // Theme colors:
        // BG: --card-background-color OR OLD: --paper-card-background-color
        // FG: --primary-text-color (for off: --secondary-text-color)

        const bfg = ViewUtils.calculateBackAndForeground(this._ctrl, this._offBackground);
        const shadow = ViewUtils.calculateDefaultShadow(card, this._ctrl, this._config.offShadow);

        this.style.setProperty(
            '--hue-background',
            bfg.background?.toString() ?? Consts.ThemeCardBackgroundVar
        );
        this.style.setProperty(
            '--hue-text-color',
            bfg.foreground?.toString() ?? Consts.ThemeSecondaryTextColorVar
        );
        this.style.setProperty(
            '--hue-switch-handle-color',
            bfg.background?.lastColor.toString() ?? Consts.ThemeCardBackgroundVar
        );
        this.style.setProperty(
            '--ha-card-box-shadow',
            shadow
        );
        this.style.setProperty(
            '--hue-box-shadow',
            shadow
        );

        // sometimes the element is not yet displayed, so we need to try calculate shadow later
        if (!shadow) {
            this._lt.setTimeout(() => this.updateStylesInner(false), 100);
        }
        else {
            this._lt.reset();
        }
    }

    private onChangeHandler = () => this.onChangeCallback();
    private onChangeCallback() {
        this.requestUpdate();
        this.updateStylesInner();
    }

    protected override render() {
        if (this._error) {
            return html`<ha-alert alert-type="error" .title=${this._error.message}>
                ${this._error.stack ? html`<pre>${this._error.stack}</pre>` : nothing}
            </ha-alert>`;
        }

        // no config, ctrl or hass
        if (!this._config || !this._ctrl || !this._hass || !this._config.isVisible)
            return nothing;

        const titleTemplate = this._config.getTitle(this._ctrl);
        const descriptionTemplate = this._ctrl.getDescription(this._config.description);

        const title = titleTemplate.resolveToString(this._hass);
        const description = descriptionTemplate.resolveToString(this._hass);

        const showSwitch = this._config.showSwitch;
        const textClass = { 'text-area': true, 'no-switch': !showSwitch };
        const cardClass = {
            'state-on': this._ctrl.isOn(),
            'state-off': this._ctrl.isOff(),
            'state-unavailable': this._ctrl.isUnavailable(),
            'hue-borders': this._config.hueBorders
        };

        return html`<ha-card class="${classMap(cardClass)}">
            <div class="main-info">
                <div class="tap-area">
                <ha-icon icon="${this._config.icon || this._ctrl.getIcon()}"></ha-icon>
                <div class="${classMap(textClass)}">
                        <h2>${title}</h2>
                        <div class="desc">${description}</div>
                    </div>
                </div>
                ${showSwitch ? ViewUtils.createM3Switch(this._ctrl, this.onChangeHandler, this._config.switchOnScene) : nothing}
            </div>
            ${ViewUtils.createSlider(this._ctrl, this._config, this.onChangeHandler)}
        </ha-card>`;
    }

    public override connectedCallback(): void {
        super.connectedCallback();
        // CSS
        this.updateStylesInner();
        // Listeners
        this.setupListeners();
    }

    public override disconnectedCallback(): void {
        super.disconnectedCallback();
        this.destroyListeners();
    }

    private setupListeners() {
        if (!this._ctrlListenerRegistered && this._ctrl) {
            this._ctrlListenerRegistered = true;
            this._ctrl.registerOnPropertyChanged(this._elementId, this.onChangeHandler);
        }

        const tapArea = this.renderRoot.querySelector('.tap-area');
        if (tapArea && !this._mc) {
            this._mc = new Manager(tapArea);
            this._mc.add(new Press());
            this._mc.on('press', (): void => {
                this.cardHolded();
            });
            this._mc.add(new Tap({ event: 'singletap' }));
            this._mc.on('singletap', (): void => {
                this.cardClicked();
            });
            this._gc = new PreventGhostClick(tapArea);
        }

        // API
        if (this._config?.apiId && !this._apiUnregister && this.getEditMode() != 'editor') {
            this._apiUnregister = HueApiProvider.registerCard(this._config.apiId, this);
        }
    }

    private destroyListeners() {
        if (this._ctrl) {
            this._ctrl.unregisterOnPropertyChanged(this._elementId);
            this._ctrlListenerRegistered = false;
        }
        if (this._mc) {
            this._mc.destroy();
            this._mc = undefined;
        }
        if (this._gc) {
            this._gc.destroy();
            this._gc = undefined;
        }
        // API
        if (this._apiUnregister) {
            this._apiUnregister();
            this._apiUnregister = undefined;
        }
    }

    /**
     * @returns Public API object
     */
    public api(): ICardApi {
        return {
            openHueScreen: () => this._actionHandler?.openHueScreen()
        };
    }
}
