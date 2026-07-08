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
    ) {
        super(translationKey);
    }

    toPayload(): TranslatableHttpErrorPayload
    {
        return {
            type: 'translatable_http_error',
            translationKey: this.translationKey,
        };
    }
}

export type TranslatableHttpErrorPayload = {
    type: 'translatable_http_error';
    translationKey: string;
};

export const isTranslatableHttpErrorPayload = (payload: unknown): payload is TranslatableHttpErrorPayload => {
    return typeof payload === 'object'
        && payload !== null
        && typeof (payload as { type?: unknown }).type === 'string'
        && (payload as { type: string }).type === 'translatable_http_error'
    ;
};
