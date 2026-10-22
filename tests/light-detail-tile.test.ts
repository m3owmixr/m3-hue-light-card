import { Color } from '../src/core/colors/color';
import { Consts } from '../src/types/consts';
import { HueLightDetailTile } from '../src/controls/light-detail-tile';
import { LightDetailLayout } from '../src/core/light-detail-layout';

const blue = () => new Color('#3050c0');

describe('HueLightDetailTile.tileColors', () => {
    it('leaves an off tile to the CSS defaults', () => {
        expect(HueLightDetailTile.tileColors(null, false, false, false)).toEqual({ background: null, outline: null, foreground: null, switchTrack: null, switchHandle: null });
    });

    it('tints a lit tile lightly, like the light rows', () => {
        const colors = HueLightDetailTile.tileColors(blue(), true, false, false);
        expect(colors.background).toBe('rgba(48,80,192,0.26)');
        expect(colors.outline).toBeNull();
        expect(colors.foreground).toBeNull();
    });

    it('fills a selected lit tile with the light color and outlines it', () => {
        const colors = HueLightDetailTile.tileColors(blue(), true, false, true);
        expect(colors.background).toBe('rgb(48,80,192)');
        expect(colors.outline).not.toBeNull();
        expect(colors.foreground).toBe(Consts.LightColor.toString());
    });

    it('uses a dark foreground on a pale selected tile', () => {
        expect(HueLightDetailTile.tileColors(new Color('#ffe9a0'), true, false, true).foreground).toBe(Consts.DarkColor.toString());
    });

    it('gives an unavailable light no lit tint', () => {
        expect(HueLightDetailTile.tileColors(blue(), true, true, false).background).toBeNull();
    });

    it('outlines a selected off tile in the text color', () => {
        const colors = HueLightDetailTile.tileColors(blue(), false, false, true);
        expect(colors.background).toBeNull();
        expect(colors.outline).toContain('--hue-text-color');
    });
});

describe('HueLightDetailTile switch colors', () => {
    it('draws a selected lit tile\'s switch in its foreground, so it shows on the fill', () => {
        const colors = HueLightDetailTile.tileColors(blue(), true, false, true);
        expect(colors.switchTrack).toBe(colors.foreground);
        expect(colors.switchHandle).toBe(colors.background);
    });

    it('draws a lit tile\'s switch in the light color, like the light rows', () => {
        expect(HueLightDetailTile.tileColors(blue(), true, false, false).switchTrack).toBe('rgb(48,80,192)');
    });

    it('leaves an off tile\'s switch to the theme', () => {
        expect(HueLightDetailTile.tileColors(blue(), false, false, false).switchTrack).toBeNull();
    });
});

describe('HueLightDetailTile layout', () => {
    it('fits a two-line name and the switch in the tile row', () => {
        expect(HueLightDetailTile.contentHeight(2)).toBeLessThanOrEqual(LightDetailLayout.tileRowHeight);
    });
});
