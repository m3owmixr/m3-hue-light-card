import { html, render } from 'lit';
import { horizontalScroll } from '../src/directives/horizontal-scroll';

function createScroller() {
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(html`<div class="scroller" ${horizontalScroll()}></div>`, container);
    const el = container.querySelector('.scroller') as HTMLElement;
    // jsdom has no layout: pretend the content overflows
    Object.defineProperty(el, 'scrollWidth', { value: 1000 });
    Object.defineProperty(el, 'clientWidth', { value: 300 });
    return el;
}

const wheel = (el: HTMLElement, deltaX: number, deltaY: number) => {
    const ev = new WheelEvent('wheel', { deltaX, deltaY, bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
    return ev;
};

describe('horizontalScroll', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('turns a mouse wheel (vertical only) into horizontal scrolling', () => {
        const el = createScroller();
        expect(wheel(el, 0, 100).defaultPrevented).toBe(true);
    });

    it('leaves a sideways trackpad swipe with a little vertical movement to the browser', () => {
        const el = createScroller();
        expect(wheel(el, 12, 2).defaultPrevented).toBe(false);
        expect(wheel(el, -8, -3).defaultPrevented).toBe(false);
    });

    it('leaves a purely horizontal swipe to the browser', () => {
        const el = createScroller();
        expect(wheel(el, 20, 0).defaultPrevented).toBe(false);
    });
});
