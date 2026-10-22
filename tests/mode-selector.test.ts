import { HueColorTempModeSelector } from '../src/controls/color-temp-mode-selector';

describe('HueColorTempModeSelector.shouldRender', () => {
    it('shows the toggle when both modes are available', () => {
        expect(HueColorTempModeSelector.shouldRender('color', true, true)).toBe(true);
    });

    it('hides it for brightness-only lights', () => {
        expect(HueColorTempModeSelector.shouldRender('brightness', true, true)).toBe(false);
    });

    it('hides it when only one mode is available', () => {
        expect(HueColorTempModeSelector.shouldRender('color', true, false)).toBe(false);
        expect(HueColorTempModeSelector.shouldRender('temp', false, true)).toBe(false);
    });
});

describe('HueColorTempModeSelector toggle', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    async function create() {
        const el = document.createElement(HueColorTempModeSelector.ElementName) as HueColorTempModeSelector;
        document.body.appendChild(el);
        await el.updateComplete;
        return el;
    }

    it('renders one pressed option per mode', async () => {
        const el = await create();
        const options = el.shadowRoot!.querySelectorAll('button.option');
        expect(options.length).toBe(2);
        expect(options[0].getAttribute('aria-pressed')).toBe('true');
        expect(options[1].getAttribute('aria-pressed')).toBe('false');
        expect(options[1].getAttribute('aria-label')).toBe('Temperature');
    });

    it('switches mode when an option is clicked', async () => {
        const el = await create();
        (el.shadowRoot!.querySelectorAll('button.option')[1] as HTMLElement).click();
        await el.updateComplete;
        expect(el.mode).toBe('temp');
    });
});
