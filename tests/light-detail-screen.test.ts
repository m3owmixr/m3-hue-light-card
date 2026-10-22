import { HueColorTempPicker } from '../src/controls/color-temp-picker';
import { HueLightDetail, LightMarkerManager } from '../src/controls/light-detail';
import { HueLightDetailTile } from '../src/controls/light-detail-tile';
import { ISingleLightContainer } from '../src/types/types-interface';
import { HomeAssistant } from 'custom-card-helpers';
import { AreaLightController } from '../src/core/area-light-controller';
import { Color } from '../src/core/colors/color';
import { hassMockup } from './mockup-hass-states';

// only what LightMarkerManager reads
function light(id: string, on: boolean, unavailable = false) {
    return {
        getEntityId: () => id,
        isOn: () => on,
        isUnavailable: () => unavailable,
        isColorModeColor: () => true,
        isColorModeTemp: () => false,
        color: null,
        colorTemp: null,
        getIcon: () => 'mdi:lamp',
        features: { isEmpty: () => false, isOnlyBrightness: () => false, color: true, colorTemp: false }
    } as unknown as ISingleLightContainer;
}

beforeAll(() => {
    // jsdom has no SVG geometry; markers fall back to their fixed sizes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (SVGElement.prototype as any).getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 });
});

describe('LightMarkerManager visibility', () => {
    it('hides an off light that is merely active, not selected', () => {
        const picker = new HueColorTempPicker();
        const manager = new LightMarkerManager(picker, () => undefined);
        const a = light('light.a', false);
        const b = light('light.b', false);
        manager.add(a, b); // adding activates each marker, so b ends up active

        manager.setSelected(['light.a']);

        expect(manager.getMarker(a).hidden).toBe(false);
        expect(manager.getMarker(b).hidden).toBe(true);
    });
});

describe('LightMarkerManager off colors', () => {
    it('draws an off light\'s pin in the theme outline tone, not black', () => {
        const manager = new LightMarkerManager(new HueColorTempPicker(), () => undefined);
        const off = light('light.off', false);
        manager.add(off);
        expect(manager.getMarker(off).offColor).toBe('var(--md-sys-color-outline, var(--secondary-text-color))');
    });

    it('draws an unavailable light\'s pin in the outline-variant tone', () => {
        const manager = new LightMarkerManager(new HueColorTempPicker(), () => undefined);
        const gone = light('light.gone', false, true);
        manager.add(gone);
        expect(manager.getMarker(gone).offColor).toBe('var(--md-sys-color-outline-variant, var(--disabled-text-color))');
    });
});

describe('HueLightDetail.findSelectedTile', () => {
    it('finds the selected tile before its attribute is reflected', () => {
        const root = document.createElement('div');
        const first = document.createElement(HueLightDetailTile.ElementName) as HueLightDetailTile;
        const second = document.createElement(HueLightDetailTile.ElementName) as HueLightDetailTile;
        root.append(first, second);
        // the previous selection: its property is cleared during the parent's render, the attribute only later
        first.setAttribute('selected', '');
        first.selected = false;
        second.selected = true; // the new selection, not reflected yet

        expect(root.querySelector('[selected]')).toBe(first); // what the old attribute query found

        expect(HueLightDetail.findSelectedTile(root)).toBe(second);
    });
});

describe('HueLightDetail styles', () => {
    const cssText = HueLightDetail.styles.cssText;

    it('draws the back arrow in the text color, not the theme accent', () => {
        expect(cssText).toContain('--icon-primary-color');
        expect(cssText).toContain('--wa-color-on-normal');
    });

    it('keeps the control row in the layout for on/off-only lights (no jump)', () => {
        expect(cssText).toMatch(/\.controls\.invisible\s*\{\s*visibility:\s*hidden/);
    });
});

describe('HueLightDetail merging lights on the wheel', () => {
    it('does not reload the merged lights from hass (that would undo the drag and split the merge)', () => {
        const hass = <HomeAssistant>{
            ...hassMockup,
            states: {
                ...hassMockup.states,
                'light.test2': { ...hassMockup.states['light.test'], entity_id: 'light.test2' }
            }
        };
        const area = new AreaLightController(['light.test', 'light.test2'], new Color('#fff'));
        area.hass = hass;
        const detail = new HueLightDetail();
        detail.areaController = area;

        const reloaded = jest.fn();
        area.getLights()[0].registerOnPropertyChanged('merge-test', reloaded, /* includeHass: */ true);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (detail as any).setLightContainerFromPicker(area.getLights());

        area.getLights()[0].unregisterOnPropertyChanged('merge-test');
        expect(detail.lightContainer!.getLights().length).toBe(2);
        expect(reloaded).not.toHaveBeenCalled();
    });
});
