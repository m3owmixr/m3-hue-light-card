import { Color } from '../src/core/colors/color';
import { Consts } from '../src/types/consts';
import { HueLightDetailTile } from '../src/controls/light-detail-tile';

const blue = () => new Color('#3050c0');

describe('HueLightDetailTile.tileColors', () => {
    it('leaves an off tile to the CSS defaults', () => {
        expect(HueLightDetailTile.tileColors(null, false, false, false)).toEqual({ background: null, outline: null, foreground: null });
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
