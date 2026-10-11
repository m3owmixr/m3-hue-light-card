import { Color } from '../core/colors/color';
import { KnownIconSize } from './types-config';

export class Consts {
    public static readonly Version = 'v2.0.0';
    public static readonly Dev = true;
    // '-m3' keeps every inner element unique, so this fork can be installed alongside the original card
    public static readonly ElementPostfix = Consts.Dev ? '-m3-test' : '-m3';
    public static readonly CardElementName = 'm3-hue-light-card' + (Consts.Dev ? '-test' : '');
    public static readonly ApiProviderName = Consts.Dev ? 'm3_hue_card_test' : 'm3_hue_card';

    public static readonly CardName = 'M3 Hue Light Card' + (Consts.Dev ? ' [TEST]' : '');
    public static readonly CardDescription = 'Hue-like light control, restyled for Material 3' + (Consts.Dev ? ' [TEST]' : '');

    public static readonly HueBorderRadius = 10;
    public static readonly HueShadow = '0px 2px 3px rgba(0,0,0,0.4)';
    public static readonly LightColor = new Color('#fff');
    public static readonly LightOffColor = new Color('#fff', 0.85);
    public static readonly DarkColor = new Color(0, 0, 0, 0.7);
    public static readonly DarkOffColor = new Color(0, 0, 0, 0.5);
    public static readonly WarmColor = '#ffda95';
    public static readonly ColdColor = '#f5f5ff';
    public static readonly DefaultColor = 'warm';
    public static readonly OffColor = '#666';
    public static readonly TileOffColor = 'rgba(102, 102, 102, 0.6)';
    public static readonly DialogBgColor = '#171717';
    public static readonly DialogFgLightColor = new Color('#aaa');
    public static readonly DialogOffColor = '#363636';
    public static readonly GradientOffset = 7; // percent
    public static readonly TransitionDefault = 'all 0.3s ease-out 0s';
    /** tint: harmonized - share of the light color mixed into the theme surface at full brightness (0..1) */
    public static readonly HarmonizedTintAmount = 0.45;
    /** tint: harmonized - share at the lowest brightness; brightness is shown by tint strength instead of the dark shadow */
    public static readonly HarmonizedTintAmountMin = 0.15;
    /** theme surface used for tint: harmonized, most specific first */
    public static readonly TintSurfaceVariables = ['--md-sys-color-surface-container-high', '--ha-card-background', '--card-background-color'];
    /** tint: harmonized off card, applied as CSS so it doesn't depend on parsing the theme value */
    public static readonly TintSurfaceCss = 'var(--md-sys-color-surface-container-high, var(--ha-card-background, var(--card-background-color)))';
    public static readonly TintOnSurfaceCss = 'var(--md-sys-color-on-surface, var(--primary-text-color))';

    // Theme colors
    public static readonly ThemeDefault = 'default';
    public static readonly ThemeCardBackground = '--hue-detected-card-bg';
    public static readonly ThemeCardBackgroundVar = `var(${Consts.ThemeCardBackground})`;
    public static readonly ThemeCardPossibleBackgrounds = [
        '--ha-card-background',
        '--card-background-color',
        '--paper-card-background-color',
        '--primary-background-color'
    ];
    public static readonly ThemeDialogHeadingColorVar = 'var(--mdc-dialog-heading-ink-color)';
    public static readonly ThemePrimaryTextColorVar = 'var(--primary-text-color)';
    public static readonly ThemeSecondaryTextColorVar = 'var(--secondary-text-color)';

    // Icon size
    public static readonly IconSize:Record<KnownIconSize, number> = {
        'big': 2.0,
        'original': 1.41666667,
        'small': 1.0
    };
}