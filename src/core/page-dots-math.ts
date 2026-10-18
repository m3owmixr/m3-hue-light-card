/**
 * Maths for the page dots under a horizontal scroller. One page = the scroller's visible width.
 */
export class PageDotsMath {

    /**
     * @returns Number of pages, 0 when everything fits (no dots needed).
     */
    public static pageCount(scrollWidth: number, clientWidth: number): number {
        if (clientWidth <= 0 || scrollWidth <= clientWidth + 1)
            return 0;

        return Math.ceil(scrollWidth / clientWidth);
    }

    /**
     * @returns 0-based current page; the last page when scrolled to the end.
     */
    public static currentPage(scrollLeft: number, scrollWidth: number, clientWidth: number): number {
        const count = PageDotsMath.pageCount(scrollWidth, clientWidth);
        if (count == 0)
            return 0;

        if (scrollLeft >= scrollWidth - clientWidth - 1)
            return count - 1;

        return Math.min(count - 1, Math.max(0, Math.round(scrollLeft / clientWidth)));
    }

    /**
     * @returns scrollLeft that shows the given page.
     */
    public static pageScrollLeft(page: number, scrollWidth: number, clientWidth: number): number {
        const max = Math.max(0, scrollWidth - clientWidth);
        return Math.min(max, Math.max(0, page * clientWidth));
    }
}
