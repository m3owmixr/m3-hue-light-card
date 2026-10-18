describe('PreventGhostClick', () => {
    it('removes its touch listeners on destroy', () => {
        // touch support is detected when the module loads
        Object.defineProperty(window, 'ontouchstart', { value: null, configurable: true });
        jest.isolateModules(() => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { PreventGhostClick } = require('../src/types/prevent-ghostclick');
            const el = document.createElement('div');
            const added = jest.spyOn(el, 'addEventListener');
            const removed = jest.spyOn(el, 'removeEventListener');

            const gc = new PreventGhostClick(el);
            expect(added).toHaveBeenCalledTimes(2);

            gc.destroy();
            expect(added).toHaveBeenCalledTimes(2);
            expect(removed.mock.calls.map(c => c[0]).sort()).toEqual(['touchend', 'touchstart']);
        });
    });
});
