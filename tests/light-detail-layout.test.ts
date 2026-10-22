import { LightDetailLayout } from '../src/core/light-detail-layout';

const features = (empty: boolean, onlyBrightness: boolean) => ({
    isEmpty: () => empty,
    isOnlyBrightness: () => onlyBrightness
});

describe('LightDetailLayout.detailKind', () => {
    it('shows the big switch for an on/off-only light', () => {
        expect(LightDetailLayout.detailKind(features(true, false))).toBe('switch');
    });

    it('shows no wheel for a brightness-only light', () => {
        expect(LightDetailLayout.detailKind(features(false, true))).toBe('brightness');
    });

    it('shows the wheel for a color light', () => {
        expect(LightDetailLayout.detailKind(features(false, false))).toBe('wheel');
    });
});

describe('LightDetailLayout sizes', () => {
    it('targets today\'s wheel size, capped at 400px', () => {
        expect(LightDetailLayout.targetWheelSize(512)).toBe(400);
        expect(LightDetailLayout.targetWheelSize(360)).toBe(300);
        expect(LightDetailLayout.targetWheelSize(40)).toBe(0);
    });

    it('adds the tile row to the chrome only when there are tiles', () => {
        expect(LightDetailLayout.chromeHeight(false)).toBe(152);
        expect(LightDetailLayout.chromeHeight(true)).toBe(304);
    });

    it('needs the wheel plus the chrome', () => {
        expect(LightDetailLayout.requiredHeight(512, true)).toBe(704);
    });

    it('gives the wheel area what is left, up to the target', () => {
        expect(LightDetailLayout.wheelAreaSize(512, 900, true)).toBe(400);
        expect(LightDetailLayout.wheelAreaSize(512, 600, true)).toBe(296);
        expect(LightDetailLayout.wheelAreaSize(512, 200, true)).toBe(0);
    });
});

describe('LightDetailLayout.contentMinHeight', () => {
    it('grows the content by what the surface lacks', () => {
        expect(LightDetailLayout.contentMinHeight(704, 500, 300, 1000)).toBe(504);
    });

    it('leaves a tall enough dialog alone', () => {
        expect(LightDetailLayout.contentMinHeight(704, 800, 600, 1000)).toBeNull();
    });

    it('never grows the dialog past the viewport', () => {
        // surface capped at 600 - 48 = 552
        expect(LightDetailLayout.contentMinHeight(704, 500, 300, 600)).toBe(352);
    });
});

describe('LightDetailLayout selection', () => {
    it('shows a marker for a lit or selected light only', () => {
        expect(LightDetailLayout.markerVisible(true, false)).toBe(true);
        expect(LightDetailLayout.markerVisible(false, true)).toBe(true);
        expect(LightDetailLayout.markerVisible(false, false)).toBe(false);
    });

    it('lists merged light names', () => {
        expect(LightDetailLayout.title(['Floor Lamp', 'TV Light'])).toBe('Floor Lamp, TV Light');
        expect(LightDetailLayout.title(['Floor Lamp'])).toBe('Floor Lamp');
    });

    it('selects every light in the selection', () => {
        expect(LightDetailLayout.isSelected('light.a', ['light.a', 'light.b'])).toBe(true);
        expect(LightDetailLayout.isSelected('light.c', ['light.a'])).toBe(false);
    });

    it('shows tiles for more than one light', () => {
        expect(LightDetailLayout.showsTiles(1)).toBe(false);
        expect(LightDetailLayout.showsTiles(2)).toBe(true);
    });
});
