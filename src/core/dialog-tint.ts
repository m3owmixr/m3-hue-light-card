import { Consts } from '../types/consts';
import { TintType } from '../types/types-config';
import { Background } from './colors/background';
import { Color } from './colors/color';
import { ViewUtils } from './view-utils';

/**
 * Color maths for the scene dialog: a lightly harmonized base surface with a soft glow of the light colors on top.
 */
export class DialogTint {

    /**
     * Share of the light color mixed into the dialog's base surface for given brightness (0-100).
     */
    public static baseAmount(brightness: number): number {
        return ViewUtils.harmonizedTintAmount(brightness) * Consts.DialogBaseTintFactor;
    }

    /**
     * @returns Whether the surface is light (light theme).
     */
    public static isLightSurface(surface: Color): boolean {
        return surface.getLuminance() > 127.5;
    }

    /**
     * Opacity of the glow for given brightness (0-100). A missing surface is treated as dark and tint: full.
     */
    public static glowOpacity(brightness: number, tint: TintType, surface: Color | null): number {
        const b = Math.min(100, Math.max(0, brightness)) / 100;
        let opacity = Consts.DialogGlowOpacityMin + (Consts.DialogGlowOpacity - Consts.DialogGlowOpacityMin) * b;

        if (surface && DialogTint.isLightSurface(surface)) {
            opacity *= Consts.DialogGlowLightThemeFactor;
        }
        if (tint == TintType.Full || !surface) {
            opacity *= Consts.DialogGlowFullFactor;
        }

        return Math.min(opacity, Consts.DialogGlowOpacityMax);
    }

    /**
     * Colors of the glow. tint: harmonized mixes the lights into the surface, otherwise the raw light colors are used.
     */
    public static glowBackground(lights: Background, surface: Color | null, tint: TintType): Background {
        if (tint == TintType.Harmonized && surface) {
            return lights.mixInto(surface, Consts.DialogGlowMix);
        }
        return lights;
    }

    /**
     * Lowers the glow opacity (in 0.01 steps) until the foreground keeps Consts.DialogMinContrast
     * against every glow color where the glow is strongest.
     * @param foreground Text color picked for the base surface (may be translucent).
     */
    public static readableGlowOpacity(base: Color, glow: Background, foreground: Color, opacity: number): number {
        let result = Math.round(opacity * 100) / 100;
        while (result > 0 && !glow.colors.every(c => DialogTint.isReadable(base.mix(c, result), foreground))) {
            result = Math.max(0, Math.round((result - 0.01) * 100) / 100);
        }
        return result;
    }

    /**
     * The color where the glow is strongest (base surface with the readable glow on top).
     */
    public static peakColor(light: Color, surface: Color, brightness: number, tint: TintType): Color {
        const base = surface.mix(light, DialogTint.baseAmount(brightness));
        const glow = DialogTint.glowBackground(new Background([light]), surface, tint);
        const foreground = base.getForeground(Consts.LightColor, Consts.DarkColor, 0);
        const opacity = DialogTint.readableGlowOpacity(base, glow, foreground, DialogTint.glowOpacity(brightness, tint, surface));
        return base.mix(glow.colors[0], opacity);
    }

    /**
     * WCAG contrast ratio of two opaque colors.
     */
    public static contrastRatio(a: Color, b: Color): number {
        const la = DialogTint.relativeLuminance(a);
        const lb = DialogTint.relativeLuminance(b);
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    }

    private static isReadable(background: Color, foreground: Color): boolean {
        // translucent text is seen mixed with what's behind it
        const opaqueFg = background.mix(new Color(foreground.getRed(), foreground.getGreen(), foreground.getBlue()), foreground.getOpacity());
        return DialogTint.contrastRatio(opaqueFg, background) >= Consts.DialogMinContrast;
    }

    private static relativeLuminance(c: Color): number {
        const channel = (v: number) => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * channel(c.getRed()) + 0.7152 * channel(c.getGreen()) + 0.0722 * channel(c.getBlue());
    }
}
