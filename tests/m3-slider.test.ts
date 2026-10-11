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
