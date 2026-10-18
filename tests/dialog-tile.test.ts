import { html } from 'lit';
import { HueDialogTile } from '../src/controls/dialog-tile';

class TestTile extends HueDialogTile {
    public clicks = 0;

    public constructor() {
        super();
    }

    protected override tileClicked(): void {
        this.clicks++;
    }

    protected override getEntityId() {
        return undefined;
    }

    protected override updated(): void {
        // nothing to update
    }

    protected override render() {
        return html`<div class="hue-tile">tile</div>`;
    }
}
customElements.define('test-dialog-tile', TestTile);

async function createTile() {
    const el = document.createElement('test-dialog-tile') as TestTile;
    document.body.appendChild(el);
    await el.updateComplete;
    const target = el.shadowRoot!.querySelector('.hue-tile') as HTMLElement;
    return { el, target };
}

const press = (target: HTMLElement, key: string) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

describe('HueDialogTile keyboard', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('is focusable as a button', async () => {
        const { target } = await createTile();
        expect(target.getAttribute('tabindex')).toBe('0');
        expect(target.getAttribute('role')).toBe('button');
    });

    it('activates with Enter and Space', async () => {
        const { el, target } = await createTile();
        press(target, 'Enter');
        expect(el.clicks).toBe(1);
        press(target, ' ');
        expect(el.clicks).toBe(2);
    });

    it('ignores other keys', async () => {
        const { el, target } = await createTile();
        press(target, 'a');
        press(target, 'Tab');
        expect(el.clicks).toBe(0);
    });
});
