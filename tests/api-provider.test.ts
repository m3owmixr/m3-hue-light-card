import { HueApiProvider } from '../src/core/api-provider';
import { Consts } from '../src/types/consts';

describe('HueApiProvider', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provider = HueApiProvider as any;
    const hashFor = (methodName: string) => '#' + Consts.ApiProviderName + ':' + methodName;

    beforeEach(() => jest.useFakeTimers());
    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('calls a registered API method named in the hash', () => {
        const method = jest.fn();
        provider._wrapper['card_openHueScreen'] = method;

        provider.onHashChanged(hashFor('card_openHueScreen'));
        jest.runAllTimers();

        expect(method).toHaveBeenCalledTimes(1);
        delete provider._wrapper['card_openHueScreen'];
    });

    it.each(['toString', 'constructor', 'hasOwnProperty', '__proto__'])('ignores inherited member %s in the hash', name => {
        const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const inherited = jest.spyOn(Object.prototype, 'toString');

        provider.onHashChanged(hashFor(name));
        jest.runAllTimers();

        expect(inherited).not.toHaveBeenCalled();
        expect(error).toHaveBeenCalledWith(expect.stringContaining(`API function named ${name} was NOT found`));
    });
});
