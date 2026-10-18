import { forwardHaptic } from 'custom-card-helpers';
import { css, html, nothing, PropertyValues, unsafeCSS } from 'lit';
import { Color } from '../core/colors/color';
import { HueEffectQueue } from '../core/effect-queue';
import { Consts } from '../types/consts';
import { HueDialogTile, ITileEventDetail } from './dialog-tile';

/**
 * Shared implementation for scene tiles in HueDialog. Base Class
 */
export abstract class HueDialogSceneTile extends HueDialogTile {
    public static override readonly ElementName = HueDialogTile.ElementName + '-scene';

    private readonly _effectQueue = new HueEffectQueue();

    private static readonly pictureDimensions = HueDialogTile.height / 2; // px (also sizes icons in light tiles)
    private static readonly pictureWidth = 88; // px
    private static readonly pictureHeight = 64; // px
    public static readonly iconScale = (HueDialogSceneTile.pictureDimensions * 0.75) / 24; // 24 = default icon size
    /** how long the see-through tint stays after a tap (spec: about 3 seconds) */
    private static readonly highlightMs = 3000;

    protected abstract getTileTitle(): string | undefined;
    protected abstract getTilePicture(): string | undefined;
    protected abstract getTileIcon(): string | null;
    protected abstract getTileAccentColor(): Promise<Color | undefined>;
    protected abstract activateTile(): void;
    protected abstract isTileDataChanged(changedProps: PropertyValues): boolean;

    protected override tileClicked() {
        if (this.getTileTitle() == null) {
            return;
        }

        // vibrate a little
        forwardHaptic('light');

        // activate scene
        this.activateTile();

        // stops the animation and clears the queue
        this._effectQueue.stopAndClear();

        // find tile and show the see-through tint for a while (no lasting "active scene", see spec)
        const tileElement = this.renderRoot.querySelector('.scene');
        if (tileElement) {
            tileElement.classList.remove('clicked');
            this._effectQueue.addEffect(0, () => tileElement.classList.add('clicked'));
            this._effectQueue.addEffect(HueDialogSceneTile.highlightMs, () => tileElement.classList.remove('clicked'));
            this._effectQueue.start();
        }

        // fire event on change
        this.dispatchEvent(new CustomEvent<ITileEventDetail>('activated', {
            detail: {
                tileElement: this
            }
        }));
    }

    protected override updated(changedProps: PropertyValues) {
        if (this.isTileDataChanged(changedProps)) {
            this.getTileAccentColor().then(accentColor => {
                if (!accentColor) {
                    return;
                }

                const fg = accentColor.getForeground(Consts.LightColor, Consts.DarkColor, 20);
                const textFg = accentColor.getForeground(Consts.LightColor, new Color('black'), 20);

                this.style.setProperty('--hue-tile-accent-color', accentColor.toString());
                this.style.setProperty('--hue-tile-fg-color', fg.toString());
                this.style.setProperty('--hue-tile-fg-text-color', textFg.toString());
            });
        }
    }

    protected override render() {
        const title = this.getTileTitle();
        if (title == null) {
            return nothing;
        }

        const picture = this.getTilePicture();

        /*eslint-disable */
        return html`
        <div class='hue-tile scene' title='${title}'>
            <div class='icon-background'>
                ${picture
                ? html`
                    <div class='picture-color'>
                        <div class='picture' style='background-image:url("${picture}")'></div>
                    </div>`
                : html`
                    <div class='color'>
                        <ha-icon icon="${this.getTileIcon() || 'mdi:palette'}"></ha-icon>
                    </div>`
            }
            </div>
            <div class='title'>
                <span>${title}</span>
            </div>
        </div>
        `;
        /*eslint-enable */
    }

    public static get sceneTileStyles() {
        return [
            HueDialogTile.hueDialogStyle,
            css`
    .scene {
        cursor: pointer;
        height: auto;
        padding: 10px 10px 8px;
        transition: background 0.6s ease-out, box-shadow 0.6s ease-out, ${unsafeCSS(HueDialogTile.clickTransition)};
    }
    .scene .icon-background {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 6px;
    }
    .scene .icon-background .color,
    .scene .icon-background .picture-color,
    .scene .icon-background .picture {
        width: ${HueDialogSceneTile.pictureWidth}px;
        height: ${HueDialogSceneTile.pictureHeight}px;
        border-radius: 12px;
    }
    .scene .icon-background .color {
        display: flex;
        align-items: center;
        justify-content: center;
        /* scenes without a picture: their icon on a tinted box the size of a picture */
        background: color-mix(in srgb, var(--hue-tile-accent-color, var(--md-sys-color-secondary-container, ${unsafeCSS(Consts.TileOffColor)})) 60%, transparent);
    }
    .scene .icon-background .color ha-icon {
        color: var(--hue-tile-fg-color, ${unsafeCSS(Consts.TintOnSurfaceCss)});
        transform: scale(${HueDialogSceneTile.iconScale});
    }
    .scene .icon-background .picture {
        display: block;
        background-position: center;
        background-size: cover;
    }
    .scene .title {
        height: ${HueDialogTile.titleHeight}px;
    }

    /* just tapped: see-through tint of the scene's color (spec), fades after a few seconds */
    .scene.clicked {
        background: color-mix(in srgb, var(--hue-tile-accent-color, var(--md-sys-color-primary, var(--primary-color))) 38%, transparent);
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--hue-tile-accent-color, var(--md-sys-color-primary, var(--primary-color))) 70%, transparent);
    }
    .scene.clicked .title {
        font-weight: 500;
    }

    @media (prefers-reduced-motion: reduce) {
        .scene {
            transition: none;
        }
    }
    `];
    }
}
