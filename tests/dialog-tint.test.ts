import { Background } from '../src/core/colors/background';
import { Color } from '../src/core/colors/color';
import { DialogTint } from '../src/core/dialog-tint';
import { ViewUtils } from '../src/core/view-utils';
import { TintType } from '../src/types/types-config';
import { Consts } from '../src/types/consts';
import { ILightContainer } from '../src/types/types-interface';

const darkSurface = new Color('#2c2831');
const lightSurface = new Color('#f3edf7');

describe('DialogTint.baseAmount', () => {
    it('is the card amount scaled down for the dialog', () => {
        expect(DialogTint.baseAmount(0)).toBeCloseTo(0.15 * 0.4);
        expect(DialogTint.baseAmount(100)).toBeCloseTo(0.45 * 0.4);
    });

    it('clamps out of range brightness', () => {
        expect(DialogTint.baseAmount(-20)).toBeCloseTo(0.15 * 0.4);
        expect(DialogTint.baseAmount(180)).toBeCloseTo(0.45 * 0.4);
    });
});

describe('DialogTint.glowOpacity', () => {
    it('scales with brightness on a dark surface', () => {
        expect(DialogTint.glowOpacity(0, TintType.Harmonized, darkSurface)).toBeCloseTo(0.25);
        expect(DialogTint.glowOpacity(100, TintType.Harmonized, darkSurface)).toBeCloseTo(0.6);
    });

    it('is gentler on a light surface', () => {
        expect(DialogTint.glowOpacity(100, TintType.Harmonized, lightSurface)).toBeCloseTo(0.36);
    });

    it('is stronger for tint: full', () => {
        expect(DialogTint.glowOpacity(100, TintType.Full, darkSurface)).toBeCloseTo(0.72);
    });

    it('never exceeds the cap', () => {
        for (const tint of [TintType.Harmonized, TintType.Full]) {
            for (const surface of [darkSurface, lightSurface, null]) {
                for (const b of [-50, 0, 50, 100, 500]) {
                    expect(DialogTint.glowOpacity(b, tint, surface)).toBeLessThanOrEqual(0.75);
                }
            }
        }
    });
});

describe('DialogTint with a null surface', () => {
    it('treats a missing surface as dark and full', () => {
        expect(DialogTint.glowOpacity(100, TintType.Harmonized, null))
            .toBeCloseTo(DialogTint.glowOpacity(100, TintType.Full, darkSurface));
    });

    it('keeps the raw light colors for the glow', () => {
        const bg = new Background([new Color('#ff0000'), new Color('#0000ff')]);
        expect(DialogTint.glowBackground(bg, null, TintType.Harmonized).toString()).toBe(bg.toString());
    });
});

describe('DialogTint.glowBackground', () => {
    it('mixes the light color into the surface for tint: harmonized', () => {
        const glow = DialogTint.glowBackground(new Background([new Color('#ff0000')]), new Color('#000000'), TintType.Harmonized);
        expect(glow.toString()).toBe('rgb(179,0,0)');
    });

    it('keeps the raw colors for tint: full', () => {
        const bg = new Background([new Color('#ff0000')]);
        expect(DialogTint.glowBackground(bg, darkSurface, TintType.Full).toString()).toBe(bg.toString());
    });
});

// WCAG relative luminance / contrast, written independently of the production code
const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const relLum = (c: Color) => 0.2126 * channel(c.getRed()) + 0.7152 * channel(c.getGreen()) + 0.0722 * channel(c.getBlue());
const contrast = (a: Color, b: Color) => {
    const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
};
/** foreground (possibly translucent) composited over an opaque background */
const over = (fg: Color, bg: Color) => bg.mix(new Color(fg.getRed(), fg.getGreen(), fg.getBlue()), fg.getOpacity());

describe('DialogTint glow keeps the text readable', () => {
    const lights = ['#ffffff', '#ff0000', '#ffff00', '#00ff00', '#0000ff', '#ff8800', '#e0457a'];
    const surfaces: [string, Color][] = [['dark', darkSurface], ['light', lightSurface]];

    for (const [surfaceName, surface] of surfaces) {
        for (const tint of [TintType.Harmonized, TintType.Full]) {
            for (const hex of lights) {
                it(`${hex} on ${surfaceName} surface, tint: ${tint}`, () => {
                    const light = new Color(hex);
                    const base = surface.mix(light, DialogTint.baseAmount(100));
                    const fg = base.getForeground(Consts.LightColor, Consts.DarkColor, 0);
                    const peak = DialogTint.peakColor(light, surface, 100, tint);
                    expect(contrast(over(fg, peak), peak)).toBeGreaterThanOrEqual(4.5);
                });
            }
        }
    }

    it('keeps a strong glow for colors that are readable anyway', () => {
        const pink = new Color('#e0457a');
        const base = darkSurface.mix(pink, DialogTint.baseAmount(100));
        const glow = DialogTint.glowBackground(new Background([pink]), darkSurface, TintType.Harmonized);
        expect(DialogTint.readableGlowOpacity(base, glow, Consts.LightColor, 0.6)).toBeCloseTo(0.6);
    });

    it('lowers the glow for a bright light behind light text', () => {
        const white = new Color('#ffffff');
        const base = darkSurface.mix(white, DialogTint.baseAmount(100));
        const glow = DialogTint.glowBackground(new Background([white]), darkSurface, TintType.Harmonized);
        const opacity = DialogTint.readableGlowOpacity(base, glow, Consts.LightColor, 0.6);
        expect(opacity).toBeLessThan(0.6);
        expect(opacity).toBeGreaterThan(0.2);
    });
});

describe('ViewUtils.calculateBackAndForeground tintScale', () => {
    it('scales the harmonized mix amount', () => {
        const light = new Color(200, 100, 50);
        const ctrl = {
            isOn: () => true,
            isOff: () => false,
            getBackground: () => new Background([light]),
            brightnessValue: 60
        } as unknown as ILightContainer;
        const surface = new Color(0, 0, 0);

        const bfg = ViewUtils.calculateBackAndForeground(ctrl, null, false, null, surface, 0.4);
        const expected = surface.mix(light, ViewUtils.harmonizedTintAmount(60) * 0.4);
        expect(bfg.background?.toString()).toBe(expected.toString());
    });
});
