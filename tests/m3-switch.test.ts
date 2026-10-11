import { M3Switch } from '../src/controls/m3-switch';

async function createSwitch(props: Partial<Pick<M3Switch, 'checked' | 'disabled'>> = {}) {
    const el = document.createElement(M3Switch.ElementName) as M3Switch;
    Object.assign(el, props);
    document.body.appendChild(el);
    await el.updateComplete;
    const target = el.shadowRoot!.querySelector('[role="switch"]') as HTMLElement;
    return { el, target };
}

describe('M3Switch', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('renders an accessible switch reflecting checked', async () => {
        const { el, target } = await createSwitch({ checked: true });
        expect(target.getAttribute('aria-checked')).toBe('true');
        expect(el.hasAttribute('checked')).toBe(true);
    });

    it('toggles on click and fires change with the new checked value on target', async () => {
        const { el, target } = await createSwitch({ checked: false });
        const seen: boolean[] = [];
        el.addEventListener('change', ev => seen.push((ev.target as M3Switch).checked));

        target.click();
        await el.updateComplete;
        expect(el.checked).toBe(true);
        expect(target.getAttribute('aria-checked')).toBe('true');

        target.click();
        expect(seen).toEqual([true, false]);
    });

    it('toggles with Space and Enter', async () => {
        const { el, target } = await createSwitch({ checked: false });
        let changes = 0;
        el.addEventListener('change', () => changes++);

        target.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        expect(el.checked).toBe(true);
        target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(el.checked).toBe(false);
        target.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
        expect(changes).toBe(2);
    });

    it('ignores input when disabled', async () => {
        const { el, target } = await createSwitch({ checked: false, disabled: true });
        let changes = 0;
        el.addEventListener('change', () => changes++);

        target.click();
        target.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        expect(el.checked).toBe(false);
        expect(changes).toBe(0);
        expect(target.getAttribute('tabindex')).toBe('-1');
        expect(target.getAttribute('aria-disabled')).toBe('true');
    });
});
