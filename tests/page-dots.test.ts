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

    it('fires page-select with the clicked page', async () => {
        const { el, buttons } = await createDots(4, 1);
        const pages: number[] = [];
        el.addEventListener('page-select', ev => pages.push((ev as CustomEvent<{ page: number }>).detail.page));

        buttons[2].click();
        expect(pages).toEqual([2]);
    });
});
