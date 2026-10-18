import { Color } from '../src/core/colors/color';
import { Consts } from '../src/types/consts';
import { HueDialog } from '../src/controls/dialog';
import { HueDialogLightTile } from '../src/controls/dialog-light-tile';

const L = { on: 'On', off: 'Off', unavailable: 'Unavailable' };

describe('HueDialogLightTile.statusText', () => {
    it('shows unavailable first', () => {
        expect(HueDialogLightTile.statusText(false, true, true, 50, L)).toBe('Unavailable');
    });

    it('shows off', () => {
        expect(HueDialogLightTile.statusText(false, false, true, 50, L)).toBe('Off');
    });

    it('shows the rounded brightness of a dimmable light', () => {
        expect(HueDialogLightTile.statusText(true, false, true, 69.6, L)).toBe('70%');
    });

    it('shows on for a light without brightness', () => {
        expect(HueDialogLightTile.statusText(true, false, false, 100, L)).toBe('On');
    });
});

describe('HueDialog.showsLightsSection', () => {
    it('hides the lights section for a single light', () => {
        expect(HueDialog.showsLightsSection(1)).toBe(false);
        expect(HueDialog.showsLightsSection(0)).toBe(false);
    });

    it('shows it for two or more lights', () => {
        expect(HueDialog.showsLightsSection(2)).toBe(true);
    });
});

describe('HueDialogLightTile.switchColors', () => {
    it('fills the track with the light color', () => {
        expect(HueDialogLightTile.switchColors(new Color('#3050c0')).track).toBe('rgb(48,80,192)');
    });

    it('uses a white handle on a dark light color', () => {
        expect(HueDialogLightTile.switchColors(new Color('#3050c0')).handle).toBe('#fff');
    });

    it('uses a dark handle on a bright light color', () => {
        expect(HueDialogLightTile.switchColors(new Color('#ffe9a0')).handle).toBe(Consts.DarkColor.toString());
    });

    it('uses a dark handle on a pale pink light (better contrast than white)', () => {
        expect(HueDialogLightTile.switchColors(new Color('#f0a0e8')).handle).toBe(Consts.DarkColor.toString());
    });
});
