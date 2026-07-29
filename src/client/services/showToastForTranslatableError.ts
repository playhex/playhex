import { t } from 'i18next';
import { TranslatableHttpErrorPayload } from '../../shared/app/TranslatableHttpError.js';
import useToastsStore from '../stores/toastsStore';

export const showToastForTranslatableError = (payload: TranslatableHttpErrorPayload) => {
    useToastsStore().addToast(
        t(payload.translationKey, payload.translationParameters),
        {
            level: 'danger',
            tag: payload.translationKey,
            autoCloseAfter: 8000,
        },
    );
};
