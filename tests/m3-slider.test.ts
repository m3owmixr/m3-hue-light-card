import { M3SliderMath, Throttler } from '../src/core/m3-slider-math';

describe('M3SliderMath', () => {
    it('snaps to step and clamps to range', () => {
        expect(M3SliderMath.snap(42.4, 0, 100, 1)).toBe(42);
        expect(M3SliderMath.snap(42.6, 0, 100, 1)).toBe(43);
        expect(M3SliderMath.snap(43, 0, 100, 5)).toBe(45);
        expect(M3SliderMath.snap(-3, 1, 100, 1)).toBe(1);
        expect(M3SliderMath.snap(130, 1, 100, 1)).toBe(100);
    });

    it('computes fraction of range', () => {
        expect(M3SliderMath.fraction(50, 0, 100)).toBe(0.5);
        expect(M3SliderMath.fraction(1, 1, 100)).toBe(0);
        expect(M3SliderMath.fraction(150, 0, 100)).toBe(1);
        expect(M3SliderMath.fraction(5, 5, 5)).toBe(0);
    });

    it('maps pointer position to value, accounting for handle width', () => {
        // track 0..204px, handle 4px => usable 200px starting at 2px
        expect(M3SliderMath.valueFromPosition(2, 0, 204, 4, 0, 100, 1)).toBe(0);
        expect(M3SliderMath.valueFromPosition(102, 0, 204, 4, 0, 100, 1)).toBe(50);
        expect(M3SliderMath.valueFromPosition(202, 0, 204, 4, 0, 100, 1)).toBe(100);
        // outside of track clamps
        expect(M3SliderMath.valueFromPosition(-50, 0, 204, 4, 1, 100, 1)).toBe(1);
        expect(M3SliderMath.valueFromPosition(500, 0, 204, 4, 1, 100, 1)).toBe(100);
        // respects track offset
        expect(M3SliderMath.valueFromPosition(152, 50, 204, 4, 0, 100, 1)).toBe(50);
    });

    it('handles keyboard steps', () => {
        expect(M3SliderMath.keyValue('ArrowRight', false, 50, 0, 100)).toBe(55);
        expect(M3SliderMath.keyValue('ArrowUp', false, 50, 0, 100)).toBe(55);
        expect(M3SliderMath.keyValue('ArrowLeft', false, 50, 0, 100)).toBe(45);
        expect(M3SliderMath.keyValue('ArrowDown', true, 50, 0, 100)).toBe(49);
        expect(M3SliderMath.keyValue('ArrowRight', true, 50, 0, 100)).toBe(51);
        expect(M3SliderMath.keyValue('ArrowRight', false, 98, 0, 100)).toBe(100);
        expect(M3SliderMath.keyValue('ArrowLeft', false, 3, 1, 100)).toBe(1);
        expect(M3SliderMath.keyValue('Home', false, 50, 1, 100)).toBe(1);
        expect(M3SliderMath.keyValue('End', false, 50, 1, 100)).toBe(100);
        expect(M3SliderMath.keyValue('Enter', false, 50, 1, 100)).toBeNull();
    });
});

describe('Throttler', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('calls immediately, then at most once per interval with the latest value', () => {
        const calls: number[] = [];
        const t = new Throttler<number>(v => calls.push(v), 200);

        t.call(1);
        expect(calls).toEqual([1]);

        t.call(2);
        t.call(3);
        expect(calls).toEqual([1]);

        jest.advanceTimersByTime(200);
        expect(calls).toEqual([1, 3]);

        jest.advanceTimersByTime(200);
        expect(calls).toEqual([1, 3]);
    });

    it('cancel drops the pending trailing call', () => {
        const calls: number[] = [];
        const t = new Throttler<number>(v => calls.push(v), 200);

        t.call(1);
        t.call(2);
        t.cancel();
        jest.advanceTimersByTime(500);
        expect(calls).toEqual([1]);

        // after cancel, next call is immediate again
        t.call(4);
        expect(calls).toEqual([1, 4]);
    });
});

describe('M3SliderMath wave', () => {
    const points = (d: string) => d.replace(/^M/, '').split(' L').map(p => p.trim().split(' ').map(Number));

    it('returns an empty path when there is no room', () => {
        expect(M3SliderMath.wavePath(10, 10, 28, 3.5, 24, 0)).toBe('');
        expect(M3SliderMath.wavePath(10, 4, 28, 3.5, 24, 0)).toBe('');
    });

    it('draws a sine wave from x0 to x1 around cy', () => {
        const pts = points(M3SliderMath.wavePath(3, 100, 28, 3.5, 24, 0));

        expect(pts[0][0]).toBe(3);
        expect(pts[pts.length - 1][0]).toBe(100);
        for (const [, y] of pts) {
            expect(y).toBeGreaterThanOrEqual(28 - 3.5);
            expect(y).toBeLessThanOrEqual(28 + 3.5);
        }
        // x is absolute, so the wave doesn't shift when x0 changes: y(24) == cy, y(30) == crest
        const at = (x: number) => pts.find(p => p[0] == x)![1];
        expect(at(24)).toBeCloseTo(28, 1);
        expect(at(30)).toBeCloseTo(28 + 3.5, 1);
    });

    it('moves the wave to the right as the phase grows', () => {
        const quarter = Math.PI / 2;
        const pts = points(M3SliderMath.wavePath(0, 60, 28, 3.5, 24, quarter));
        const at = (x: number) => pts.find(p => p[0] == x)![1];
        // the crest at x=6 moves a quarter wavelength right, to x=12
        expect(at(12)).toBeCloseTo(28 + 3.5, 1);
    });

    it('computes where the active track ends', () => {
        // track 210px, handle 6px, gap 6px: usable 204px
        expect(M3SliderMath.activeTrackEnd(0.5, 210, 6, 6)).toBe(96);
        expect(M3SliderMath.activeTrackEnd(0, 210, 6, 6)).toBe(0);
        expect(M3SliderMath.activeTrackEnd(1, 210, 6, 6)).toBe(198);
    });
});
