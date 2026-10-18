import { M3PageDots } from '../src/controls/m3-page-dots';
import { PageDotsMath } from '../src/core/page-dots-math';

describe('PageDotsMath.pageCount', () => {
    it('is 0 when the content fits', () => {
        expect(PageDotsMath.pageCount(500, 500)).toBe(0);
        expect(PageDotsMath.pageCount(501, 500)).toBe(0);
        expect(PageDotsMath.pageCount(0, 0)).toBe(0);
    });

    it('counts visible-width pages', () => {
        expect(PageDotsMath.pageCount(1200, 500)).toBe(3);
    });
});

describe('PageDotsMath.currentPage', () => {
    it('rounds to the nearest page', () => {
        expect(PageDotsMath.currentPage(0, 1200, 500)).toBe(0);
        expect(PageDotsMath.currentPage(480, 1200, 500)).toBe(1);
    });

    it('is the last page when scrolled to the end', () => {
        expect(PageDotsMath.currentPage(700, 1200, 500)).toBe(2);
    });

    it('clamps overscroll', () => {
        expect(PageDotsMath.currentPage(-20, 1200, 500)).toBe(0);
    });
});

describe('PageDotsMath.pageScrollLeft', () => {
    it('scrolls one visible width per page, clamped to the scroll range', () => {
        expect(PageDotsMath.pageScrollLeft(1, 1200, 500)).toBe(500);
        expect(PageDotsMath.pageScrollLeft(2, 1200, 500)).toBe(700);
        expect(PageDotsMath.pageScrollLeft(-1, 1200, 500)).toBe(0);
    });
});

describe('PageDotsMath window', () => {
    const scales = (count: number, current: number) =>
        Array.from({ length: count }, (_, page) => PageDotsMath.dotScale(page, current, count, 7));

    it('shows every dot at full size when they all fit', () => {
        expect(scales(5, 2)).toEqual([1, 1, 1, 1, 1]);
        expect(PageDotsMath.windowStart(2, 5, 7)).toBe(0);
    });

    it('shrinks the dots toward the end when more pages follow', () => {
        expect(scales(15, 0).slice(0, 8)).toEqual([1, 1, 1, 1, 1, 0.75, 0.5, 0]);
    });

    it('slides the window with the current page and shrinks both edges', () => {
        expect(PageDotsMath.windowStart(7, 15, 7)).toBe(4);
        expect(scales(15, 7).slice(3, 12)).toEqual([0, 0.5, 0.75, 1, 1, 1, 0.75, 0.5, 0]);
    });

    it('keeps the last pages at full size at the end', () => {
        expect(PageDotsMath.windowStart(14, 15, 7)).toBe(8);
        expect(scales(15, 14).slice(7)).toEqual([0, 0.5, 0.75, 1, 1, 1, 1, 1]);
    });
});

describe('M3PageDots', () => {
    async function createDots(count: number, current: number) {
        const el = document.createElement(M3PageDots.ElementName) as M3PageDots;
        el.count = count;
        el.current = current;
        el.labelFormat = 'Page %s';
        document.body.appendChild(el);
        await el.updateComplete;
        return { el, buttons: Array.from(el.shadowRoot!.querySelectorAll('button')) };
    }

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('renders nothing for a single page', async () => {
        const { buttons } = await createDots(1, 0);
        expect(buttons.length).toBe(0);
    });

    it('renders a labeled button per page and marks the current one', async () => {
        const { buttons } = await createDots(4, 1);
        expect(buttons.length).toBe(4);
        expect(buttons[1].getAttribute('aria-label')).toBe('Page 2');
        expect(buttons[1].getAttribute('aria-current')).toBe('true');
        expect(buttons[0].hasAttribute('aria-current')).toBe(false);
    });

    it('hides dots outside the window from assistive tech', async () => {
        const { buttons } = await createDots(15, 0);
        expect(buttons[7].getAttribute('aria-hidden')).toBe('true');
        expect(buttons[7].tabIndex).toBe(-1);
        expect(buttons[6].hasAttribute('aria-hidden')).toBe(false);
    });

    it('fires page-select with the clicked page', async () => {
        const { el, buttons } = await createDots(4, 1);
        const pages: number[] = [];
        el.addEventListener('page-select', ev => pages.push((ev as CustomEvent<{ page: number }>).detail.page));

        buttons[2].click();
        expect(pages).toEqual([2]);
    });
});
