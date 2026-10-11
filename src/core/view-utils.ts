import { nothing } from 'lit';
import { html, unsafeStatic } from 'lit/static-html.js';
import { styleMap } from 'lit-html/directives/style-map.js';
import { HueLikeLightCardConfig } from '../types/config';
import { Consts } from '../types/consts';
import { Action } from '../types/functions';
import { ThemeHelper } from '../types/theme-helper';
import { ILightContainer } from '../types/types-interface';
import { Background } from './colors/background';
import { Color } from './colors/color';
import { HaIcon, IHassWindow } from '../types/types-hass';
import { SliderType } from '../types/types-config';
import { M3Slider } from '../controls/m3-slider';
import { M3Switch } from '../controls/m3-switch';

export class ViewUtils {

    /**
     * Creates switch for given ILightContainer.
     * @param onChange Be careful - this function is called on different scope, better pack your function to arrow call.
     */
    public static createSwitch(ctrl: ILightContainer, onChange: Action, switchOnScene?: string) {
        // To help change themes on the fly
        const styles = ThemeHelper.getSwitchThemeStyle();

        return html`
        <ha-switch
            .checked=${ctrl.isOn()}
            .disabled=${ctrl.isUnavailable()}
            .haptic=true
            style=${styleMap(styles)}
            @change=${(ev: Event) => ViewUtils.toggled(ev, ctrl, onChange, switchOnScene)}
        ></ha-switch>`;
    }

    /**
     * Creates M3 switch for given ILightContainer (used by the collapsed card).
     * @param onChange Be careful - this function is called on different scope, better pack your function to arrow call.
     */
    public static createM3Switch(ctrl: ILightContainer, onChange: Action, switchOnScene?: string) {
        // tinted = the card is lit, so the switch is drawn in the card's foreground color
        return html`
            <${unsafeStatic(M3Switch.ElementName)}
                class="m3-switch ${ctrl.isOn() ? 'tinted' : ''}"
                .checked=${ctrl.isOn()}
                .disabled=${ctrl.isUnavailable()}
                @change=${(ev: Event) => ViewUtils.toggled(ev, ctrl, onChange, switchOnScene)}
            ></${unsafeStatic(M3Switch.ElementName)}>`;
    }

    /**
     * Creates slider for given ILightContainer and config.
     * @param onChange Be careful - this function is called on different scope, better pack your function to arrow call.
     */
    public static createSlider(ctrl: ILightContainer, config: HueLikeLightCardConfig, onChange: Action) {

        // If the controller doesn't support brightness change or slider is disabled, the slider will not be created
        if (!ctrl.features.brightness || config.slider == SliderType.None)
            return nothing;

        const min = config.allowZero ? 0 : 1;
        const max = 100;
        const step = 1;

        // slider: default and slider: mushroom both map to the M3 slider
        // tinted = the card is lit, so the slider is drawn in the card's foreground color
        return html`
            <${unsafeStatic(M3Slider.ElementName)}
                class="brightness-slider ${ctrl.isOn() ? 'tinted' : ''}"
                .min=${min}
                .max=${max}
                .step=${step}
                .disabled=${config.allowZero ? ctrl.isUnavailable() : ctrl.isOff()}
                .value=${ctrl.brightnessValue}
                @value-changing=${(ev: CustomEvent<{ value: number }>) => ViewUtils.brightnessChanging(ev.detail.value, ctrl)}
                @change=${(ev: CustomEvent<{ value: number }>) => ViewUtils.brightnessChanged(ev.detail.value, ctrl, onChange)}
            ></${unsafeStatic(M3Slider.ElementName)}>`;
    }

    private static brightnessChanging(value: number, ctrl: ILightContainer) {
        // card re-renders itself through the controller's property-changed notification
        ctrl.brightnessValue = value;
    }

    private static brightnessChanged(value: number, ctrl: ILightContainer, onChange: Action) {
        ctrl.brightnessValue = value;
        onChange();
    }

    private static toggled(ev: Event, ctrl: ILightContainer, onChange: Action, switchOnScene?: string) {
        const target = ev.target;
        if (!target)
            return;

        const checked = (target as HTMLInputElement).checked;
        if (checked) {
            ctrl.turnOn(switchOnScene);
        }
        else {
            ctrl.turnOff();
        }

        // update styles
        onChange();
        //this.updateStyles();
    }

    /**
     * Calculates and returns background and foregound color (for actual light brightness).
     * Creates readable text on background with shadow based on current brightness.
     * @param ctrl Light controller
     * @param offBackground background used when all lights are off (null can be passed, and if used, null bg and fg will be returned)
     * @param assumeShadow If turned off, calculates foreground for max brightness (noShadow).
     * @param defaultColor Default color, if light does not provide his color.
     * @param tintSurface When set (tint: harmonized), the light colors are mixed into this surface before the foreground is calculated.
     */
    public static calculateBackAndForeground(ctrl: ILightContainer, offBackground: Background | null, assumeShadow = true, defaultColor: Background | null = offBackground, tintSurface: Color | null = null) {
        let currentBackground = ctrl.isOff() ? offBackground : (ctrl.getBackground() || defaultColor || offBackground);
        if (tintSurface && ctrl.isOn() && currentBackground && currentBackground !== offBackground) {
            currentBackground = currentBackground.mixInto(tintSurface, ViewUtils.harmonizedTintAmount(ctrl.brightnessValue));
        }

        let foreground: Color | null;
        if (currentBackground == null) {
            foreground = null;
        }
        else {
            const fgx = ViewUtils.calculateForeground(ctrl, currentBackground, assumeShadow);
            foreground = fgx.foreground;
        }

        return {
            background: currentBackground,
            foreground: foreground
        };
    }

    /**
     * tint: harmonized - share of the light color mixed into the theme surface for given brightness (0-100).
     * Dim lights blend less of their color in, so the card dims with the light without the dark shadow.
     */
    public static harmonizedTintAmount(brightness: number): number {
        const b = Math.min(100, Math.max(0, brightness)) / 100;
        return Consts.HarmonizedTintAmountMin + (Consts.HarmonizedTintAmount - Consts.HarmonizedTintAmountMin) * b;
    }

    /**
     * Calculates and returns foregound color for given background (and actual light brightness).
     * Creates readable text on background with shadow based on current brightness.
     * @param assumeShadow If turned off, calculates foreground for max brightness (noShadow).
     */
    private static calculateForeground(ctrl: ILightContainer, currentBackground: Background, assumeShadow = true) {

        let currentValue = ctrl.brightnessValue;
        // if the shadow is not present, act like the value is on max.
        if (!assumeShadow) {
            currentValue = 100;
        }

        const opacity = 1;
        const offset = ctrl.isOn() && currentValue > 50
            ? -(10 - ((currentValue - 50) / 5)) // offset: -10-0
            : 0;
        let foreground = ctrl.isOn() && currentValue <= 50
            ? Consts.LightColor // is on and under 50 => Light
            : currentBackground.getForeground(
                Consts.LightColor, // should be light
                Consts.DarkColor, // should be dark
                offset // offset for darker brightness
            );

        // make the dark little lighter, when Off
        if (ctrl.isOff()) {
            if (foreground == Consts.DarkColor) {
                foreground = Consts.DarkOffColor;
            }
            else {
                foreground = Consts.LightOffColor;
            }
        }

        return {
            foreground: foreground,
            opacity: opacity
        };
    }

    /**
     * Calculates default shadow for passed element, using passed ILightContainer state and config.
     */
    /**
     * @param brightnessShadow When false (tint: harmonized), no dark inset shadow is drawn for the brightness.
     */
    public static calculateDefaultShadow(element: Element, ctrl: ILightContainer, useOffShadow: boolean, brightnessShadow = true): string {
        if (ctrl.isOff())
            return useOffShadow ? 'inset 0px 0px 10px rgba(0,0,0,0.2)' : '0px 0px 0px white';

        if (!brightnessShadow)
            return '0px 0px 0px transparent';

        const card = element;
        if (!card || !card.clientHeight)
            return '';
        const darkness = 100 - ctrl.brightnessValue;
        const coef = (card.clientHeight / 100);
        const spread = 20;
        const position = spread + (darkness * 0.95) * coef;
        let width = card.clientHeight / 2;
        if (darkness > 70) {
            width -= (width - 20) * (darkness - 70) / 30; // width: 20-clientHeight/2
        }
        let shadowDensity = 0.65;
        if (darkness > 60) {
            shadowDensity -= (shadowDensity - 0.5) * (darkness - 60) / 40; // shadowDensity: 0.5-0.65
        }

        return `inset 0px -${position}px ${width}px -${spread}px rgba(0,0,0,${shadowDensity})`;
    }

    /** Will return whether hue custom icons (https://github.com/arallsopp/hass-hue-icons) are installed */
    public static hasHueIcons(): boolean {
        const haWindow = (window as IHassWindow);

        return !!haWindow.customIcons && typeof haWindow.customIcons.hue == 'object';
    }

    /** Will set size of icon inside of HaIcon */
    public static setIconSize(haIcon: HaIcon, sizePx: number) {
        sizePx = Math.round(sizePx);
        if (haIcon?.updateComplete) {
            // wait for render
            haIcon.updateComplete.then(() => {
                const innerIcon = <HTMLElement>haIcon.renderRoot.children[0];
                innerIcon.style.setProperty('--mdc-icon-size', sizePx + 'px');
            });
        }
    }
}