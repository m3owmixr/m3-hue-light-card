export type DetailKind = 'wheel' | 'brightness' | 'switch';

/**
 * Layout and selection rules of the color wheel screen (see doc/m3-wheel-spec.md).
 */
export class LightDetailLayout {
    public static readonly sidePadding = 16;
    public static readonly topBarHeight = 56;
    public static readonly gap = 16;
    public static readonly controlRowHeight = 48;
    public static readonly headingHeight = 32;
    public static readonly tileRowHeight = 104;
    /** Same as HueColorTempPicker.maxWidth. */
    public static readonly wheelMax = 400;
    /** Space the wheel left around itself before the restyle (40px top + 20px bottom margin). */
    public static readonly wheelMargin = 60;
    /** The grown dialog keeps this much of the viewport free. */
    public static readonly viewportMargin = 48;

    /**
     * @returns What the wheel area shows for a light with these features.
     */
    public static detailKind(features: { isEmpty(): boolean, isOnlyBrightness(): boolean }): DetailKind {
        if (features.isEmpty())
            return 'switch';
        if (features.isOnlyBrightness())
            return 'brightness';
        return 'wheel';
    }

    /**
     * @returns The wheel size the screen had before the restyle for this width (the size it shouldn't drop below).
     */
    public static targetWheelSize(width: number): number {
        return Math.max(0, Math.min(LightDetailLayout.wheelMax, width - LightDetailLayout.wheelMargin));
    }

    /**
     * @returns Height of everything on the screen except the wheel.
     */
    public static chromeHeight(hasTiles: boolean): number {
        const l = LightDetailLayout;
        let height = l.topBarHeight + l.gap + l.gap + l.controlRowHeight + l.gap;
        if (hasTiles) {
            height += l.headingHeight + l.tileRowHeight + l.gap;
        }
        return height;
    }

    /**
     * @returns Height the screen needs to show the wheel at its target size.
     */
    public static requiredHeight(width: number, hasTiles: boolean): number {
        return LightDetailLayout.targetWheelSize(width) + LightDetailLayout.chromeHeight(hasTiles);
    }

    /**
     * @returns Size of the square wheel area. The same whatever kind of light is selected, so the layout doesn't jump.
     */
    public static wheelAreaSize(width: number, height: number, hasTiles: boolean): number {
        return Math.max(0, Math.min(LightDetailLayout.targetWheelSize(width), height - LightDetailLayout.chromeHeight(hasTiles)));
    }

    /**
     * @returns Min-height for the dialog content so the surface is `required` tall (within the viewport), or null when it's tall enough.
     */
    public static contentMinHeight(required: number, surfaceHeight: number, contentHeight: number, viewportHeight: number): number | null {
        const target = Math.min(required, viewportHeight - LightDetailLayout.viewportMargin);
        if (surfaceHeight >= target)
            return null;

        return contentHeight + (target - surfaceHeight);
    }

    /**
     * @returns Whether a light's marker is drawn on the wheel. Off lights only show while selected.
     */
    public static markerVisible(isOn: boolean, isSelected: boolean): boolean {
        return isOn || isSelected;
    }

    /**
     * @returns Screen title for the selected light(s).
     */
    public static title(names: string[]): string {
        return names.join(', ');
    }

    public static isSelected(entityId: string, selectedIds: string[]): boolean {
        return selectedIds.indexOf(entityId) >= 0;
    }

    /**
     * @returns Whether the light tiles are shown (same rule as the scene screen's Lights section).
     */
    public static showsTiles(lightCount: number): boolean {
        return lightCount > 1;
    }
}
