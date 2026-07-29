/**
 * Simple error that will just display a toast to player.
 */
export class TranslatableHttpError extends Error
{
    constructor(
        /**
         * Must be in 4xx
         */
        readonly httpStatus: number,

        readonly translationKey: string,
        readonly translationParameters?: { [key: string]: undefined | string },
    ) {
        super(translationKey);
    }

    toPayload(): TranslatableHttpErrorPayload
    {
        return {
            type: 'translatable_http_error',
            translationKey: this.translationKey,
            translationParameters: this.translationParameters,
        };
    }
}

export type TranslatableHttpErrorPayload = {
    type: 'translatable_http_error';
    translationKey: string;
    translationParameters?: { [key: string]: undefined | string };
};

export const isTranslatableHttpErrorPayload = (payload: unknown): payload is TranslatableHttpErrorPayload => {
    return typeof payload === 'object'
        && payload !== null
        && typeof (payload as { type?: unknown }).type === 'string'
        && (payload as { type: string }).type === 'translatable_http_error'
    ;
};
