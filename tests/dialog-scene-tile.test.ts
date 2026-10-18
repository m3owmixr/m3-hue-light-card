import { PropertyValues } from 'lit';
import { HueDialogSceneTile } from '../src/controls/dialog-scene-tile';
import { Color } from '../src/core/colors/color';

class TestSceneTile extends HueDialogSceneTile {
    public picture: string | undefined;
    public accentCalls = 0;

    public constructor() {
        super();
    }

    protected override getTileTitle() {
        return 'Scene';
    }
    protected override getTilePicture() {
        return this.picture;
    }
    protected override getTileIcon() {
        return 'mdi:palette';
    }
    protected override getTileAccentColor() {
        this.accentCalls++;
        return Promise.resolve(new Color('#ff0000'));
    }
    protected override activateTile() {
        // nothing to activate
    }
    private _dataLoaded = false;
    protected override isTileDataChanged(_: PropertyValues) {
        // the tile's data is "new" on the first update only
        const changed = !this._dataLoaded;
        this._dataLoaded = true;
        return changed;
    }
    protected override getEntityId() {
        return undefined;
    }

    public tap() {
        this.tileClicked();
    }
}
customElements.define('test-dialog-scene-tile', TestSceneTile);

async function createTile(picture?: string) {
    const el = document.createElement('test-dialog-scene-tile') as TestSceneTile;
    el.picture = picture;
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
}

describe('HueDialogSceneTile accent color', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('loads the accent color right away for a tile without a picture', async () => {
        const el = await createTile(undefined);
        expect(el.accentCalls).toBe(1);
    });

    it('waits for a tap before reading the color of a picture', async () => {
        const el = await createTile('/assets/x.jpg');
        expect(el.accentCalls).toBe(0);

        el.tap();
        expect(el.accentCalls).toBe(1);

        el.tap();
        expect(el.accentCalls).toBe(1);
    });

    it('renders the picture as a lazy, async-decoded image', async () => {
        const el = await createTile('/assets/x.jpg');
        const img = el.shadowRoot!.querySelector('img.picture') as HTMLImageElement;
        expect(img.getAttribute('src')).toBe('/assets/x.jpg');
        expect(img.getAttribute('loading')).toBe('lazy');
        expect(img.getAttribute('decoding')).toBe('async');
    });
});
