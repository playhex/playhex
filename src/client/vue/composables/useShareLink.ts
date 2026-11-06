import { ref } from 'vue';
import copy from 'copy-to-clipboard';

type ShareResult = 'copied' | 'shared' | 'canceled' | 'unsupported';

/**
 * Share a link to send to a friend.
 * On desktop, just copy link.
 * On mobile, use share api to allow share to other apps, or just copy.
 *
 * @param href Link to share
 */
export const useShareLink = (href: string) => {
    /**
     * True if link has just been copied, false if copy failed, null to display nothing.
     */
    const copiedResult = ref<null | true | false>(null);
    let copiedResultTimeout: null | number = null;

    const shareWithShareApi = async (): Promise<ShareResult> => {
        const shareData = {
            title: document.title,
            url: href,
        };

        if (!navigator.canShare || !navigator.canShare(shareData)) {
            return 'unsupported';
        }

        try {
            await navigator.share(shareData);

            return 'shared';
        } catch (e) {
            return 'canceled';
        }
    };

    const shareOrCopy = async (): Promise<ShareResult> => {
        const result = await shareWithShareApi();

        if (result !== 'unsupported') {
            return result;
        }

        return (await copy(href)) ? 'copied' : 'unsupported';
    };

    /**
     * Use share api if available, else copy link.
     */
    const shareLink = async (): Promise<void> => {
        // In case "copied!" is already displayed, make it blink before copy again to show it worked again
        if (copiedResultTimeout !== null) {
            clearTimeout(copiedResultTimeout);
            copiedResult.value = null;
            await new Promise(resolve => setTimeout(resolve, 80));
        }

        const result = await shareOrCopy();

        if (result === 'shared' || result === 'canceled') {
            copiedResult.value = null;
            return;
        }

        if (result === 'copied') {
            copiedResult.value = true;
        }

        if (result === 'unsupported') {
            copiedResult.value = false;
        }

        copiedResultTimeout = window.setTimeout(() => {
            copiedResult.value = null;

            if (copiedResultTimeout !== null) {
                clearTimeout(copiedResultTimeout);
                copiedResultTimeout = null;
            }
        }, 30000);
    };

    return {
        copiedResult,
        shareLink,
    };
};
