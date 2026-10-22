import { nothing } from 'lit';
import { ViewUtils } from '../src/core/view-utils';
import { HueLikeLightCardConfig } from '../src/types/config';
import { ILightContainer } from '../src/types/types-interface';
import { noop } from '../src/types/functions';

// only what createSlider reads
const dimmable = {
    features: { brightness: true },
    brightnessValue: 50,
    isOn: () => true,
    isOff: () => false,
    isUnavailable: () => false
} as unknown as ILightContainer;

describe('ViewUtils.createSlider', () => {
    const config = new HueLikeLightCardConfig({ entity: 'light.a', slider: 'none' });

    it('hides the slider with slider: none', () => {
        expect(ViewUtils.createSlider(dimmable, config, noop)).toBe(nothing);
    });

    it('keeps it when asked to always show (color wheel screen)', () => {
        expect(ViewUtils.createSlider(dimmable, config, noop, true)).not.toBe(nothing);
    });
});
