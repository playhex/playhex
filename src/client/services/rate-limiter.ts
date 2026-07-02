import { t } from 'i18next';
import { RateLimitReachedErrorPayload } from '../../shared/app/rate-limiters.js';
import useToastsStore from '../stores/toastsStore.js';

export const showToastFromRateLimitPayload = (payload: RateLimitReachedErrorPayload) => {
    useToastsStore().addToast(
        t('rate_limit_reached', {
            rateLimiterName: t(payload.rateLimiterName),
            seconds: Math.ceil(payload.nextActionAvailableInMs / 1000),
        }),
        {
            level: 'danger',
        },
    );
};
