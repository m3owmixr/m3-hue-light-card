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

    /**
     * @returns First page of the visible window of dots (the window follows the current page).
     */
    public static windowStart(current: number, count: number, maxVisible: number): number {
        if (count <= maxVisible)
            return 0;

        return Math.min(count - maxVisible, Math.max(0, current - Math.floor(maxVisible / 2)));
    }

    /**
     * @returns Scale of a page's dot: 1 inside the window, shrinking toward a window edge
     * that has more pages beyond it (0.75, then 0.5), and 0 outside the window.
     */
    public static dotScale(page: number, current: number, count: number, maxVisible: number): number {
        if (page == current)
            return 1;

        const start = PageDotsMath.windowStart(current, count, maxVisible);
        const end = Math.min(count, start + maxVisible) - 1;
        if (page < start || page > end)
            return 0;

        const edgeScales = [0.5, 0.75];
        if (start > 0 && page - start < edgeScales.length)
            return edgeScales[page - start];
        if (end < count - 1 && end - page < edgeScales.length)
            return edgeScales[end - page];

        return 1;
    }
}
