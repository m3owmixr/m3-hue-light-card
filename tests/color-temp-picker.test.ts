import { HueColorTempPicker } from '../src/controls/color-temp-picker';

describe('HueTempPicker', () => {
    it('should match kelvin and position', () => {

        const picker = new HueColorTempPicker();
        picker.mode = 'temp';
        picker.setTempRange(2020, 6451);

        const x = 0;
        const radius = 950;
        const increment = 10;
        for (let y = -radius; y <= radius; y += increment) {
            const data = picker.getColorAndValue(x, y, radius);

            expect(data).not.toBeNull();
            expect(data).toHaveProperty('kelvin');

            if ('kelvin' in data!) {
                const coords = picker.getCoordinatesAndTemp(data.kelvin, radius);
                const diff = Math.abs(coords.position.Y - y);
                expect(diff).toBeLessThanOrEqual(1); // 1 px tolerance
                expect(coords.position.X).toBe(0);
            }
        }
    });

    it('should match color and position', () => {

        const picker = new HueColorTempPicker();
        picker.mode = 'color';

        const radius = 777;
        const increment = 7;
        const maxDiff = 0.005 * radius;
        for (let x = -radius; x <= radius; x += increment) {
            for (let y = -radius; y <= radius; y += increment) {
                const data = picker.getColorAndValue(x, y, radius);

                if (!data)
                    continue;

                expect(data).toHaveProperty('hsv');

                if ('hsv' in data) {
                    const [hue, saturation] = data.hsv;

                    const coords = picker.getCoordinatesAndColor(hue, saturation, radius);
                    const yDiff = Math.abs(coords.position.Y - y);
                    const xDiff = Math.abs(coords.position.X - x);

                    // the coordinates may not be the same, because we are cutting everthing over saturation 1 (previous possible value was 1.0003)
                    expect(yDiff).toBeLessThan(maxDiff);
                    expect(xDiff).toBeLessThan(maxDiff);
                }
            }
        }
    });
});
describe('HueColorTempPickerMarker.hidden', () => {
    beforeAll(() => {
        // jsdom has no SVG geometry; markers fall back to their fixed sizes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (SVGElement.prototype as any).getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 });
    });

    it('is visible by default and hides when set', () => {
        const picker = new HueColorTempPicker();
        const marker = picker.addMarker('light.a', false);
        expect(marker.hidden).toBe(false);

        marker.hidden = true;
        expect(marker.render().classList.contains('hidden')).toBe(true);
    });

    it('never offers a hidden marker as a merge target', () => {
        const picker = new HueColorTempPicker();
        const a = picker.addMarker('light.a', false);
        const b = picker.addMarker('light.b', false);
        expect(picker.searchMergeMarkerTarget(a)).toBe(b);

        b.hidden = true;
        expect(picker.searchMergeMarkerTarget(a)).toBeUndefined();
    });
});
