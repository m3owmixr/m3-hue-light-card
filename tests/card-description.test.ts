import { HomeAssistant } from 'custom-card-helpers';
import { AreaLightController } from '../src/core/area-light-controller';
import { Color } from '../src/core/colors/color';
import { hassMockup } from './mockup-hass-states';

const hass = <HomeAssistant>{
    ...hassMockup,
    states: {
        ...hassMockup.states,
        'light.test2': { ...hassMockup.states['light.test'], entity_id: 'light.test2' }
    }
};

function controller(ids: string[]) {
    const ctrl = new AreaLightController(ids, new Color('#fff'));
    ctrl.hass = hass;
    return ctrl;
}

describe('Card description', () => {
    it('is empty by default for a single light', () => {
        expect(controller(['light.test']).getDescription(undefined).resolveToString(hass)).toBe('');
    });

    it('summarizes the lights for two or more lights', () => {
        expect(controller(['light.test', 'light.test2']).getDescription(undefined).resolveToString(hass)).not.toBe('');
    });

    it('keeps an explicit description for a single light', () => {
        expect(controller(['light.test']).getDescription('On: %s').resolveToString(hass)).toBe('On: 1');
    });
});
