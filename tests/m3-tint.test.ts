import { Background } from '../src/core/colors/background';
import { Color } from '../src/core/colors/color';
import { HueLikeLightCardConfig } from '../src/types/config';
import { TintType } from '../src/types/types-config';
import { ViewUtils } from '../src/core/view-utils';
import { Consts } from '../src/types/consts';

describe('Color.mix', () => {
    it('mixes the given amount of the other color into this one', () => {
        const surface = new Color(0, 0, 0);
        const light = new Color(200, 100, 50);

        const mixed = surface.mix(light, 0.5);
        expect([mixed.getRed(), mixed.getGreen(), mixed.getBlue()]).toEqual([100, 50, 25]);
    });

    it('returns this color for 0 and the other color for 1', () => {
        const a = new Color(10, 20, 30);
        const b = new Color(250, 240, 230);

        const m0 = a.mix(b, 0);
        const m1 = a.mix(b, 1);
        expect([m0.getRed(), m0.getGreen(), m0.getBlue()]).toEqual([10, 20, 30]);
        expect([m1.getRed(), m1.getGreen(), m1.getBlue()]).toEqual([250, 240, 230]);
    });

    it('rounds and does not modify the original colors', () => {
        const a = new Color(0, 0, 0);
        const b = new Color(255, 255, 255);

        const m = a.mix(b, 0.45);
        expect(m.getRed()).toBe(115); // 114.75
        expect(a.getRed()).toBe(0);
        expect(b.getRed()).toBe(255);
    });
});

describe('Background.mixInto', () => {
    it('mixes every color of the background into the surface', () => {
        const surface = new Color(0, 0, 0);
        const bg = new Background([new Color(200, 0, 0), new Color(0, 0, 200)]);

        const mixed = bg.mixInto(surface, 0.5);
        expect(mixed.toString()).toContain('rgb(100,0,0)');
        expect(mixed.toString()).toContain('rgb(0,0,100)');
        // original untouched
        expect(bg.toString()).toContain('rgb(200,0,0)');
    });
});

describe('Config tint', () => {
    it('defaults to harmonized', () => {
        const config = new HueLikeLightCardConfig({ entity: 'light.test' });
        expect(config.tint).toBe(TintType.Harmonized);
    });

    it('parses full', () => {
        const config = new HueLikeLightCardConfig({ entity: 'light.test', tint: 'full' });
        expect(config.tint).toBe(TintType.Full);
    });

    it('throws on unknown value', () => {
        expect(() => new HueLikeLightCardConfig({ entity: 'light.test', tint: 'neon' })).toThrow();
    });
});

describe('ViewUtils.harmonizedTintAmount', () => {
    it('scales the tint with brightness between the min and max amount', () => {
        expect(ViewUtils.harmonizedTintAmount(100)).toBeCloseTo(Consts.HarmonizedTintAmount);
        expect(ViewUtils.harmonizedTintAmount(0)).toBeCloseTo(Consts.HarmonizedTintAmountMin);
        expect(ViewUtils.harmonizedTintAmount(50)).toBeCloseTo((Consts.HarmonizedTintAmount + Consts.HarmonizedTintAmountMin) / 2);
    });

    it('clamps out of range brightness', () => {
        expect(ViewUtils.harmonizedTintAmount(150)).toBeCloseTo(Consts.HarmonizedTintAmount);
        expect(ViewUtils.harmonizedTintAmount(-10)).toBeCloseTo(Consts.HarmonizedTintAmountMin);
    });
});
