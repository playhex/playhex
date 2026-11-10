import { computed, InjectionKey, onUnmounted, ref, shallowRef, watch, type Ref } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';
import { useEventListener } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { t } from 'i18next';
import { apiDeleteHexplorerStudy, apiGetHexplorerStudy, apiPostHexplorerStudy, apiPutHexplorerStudy } from '../../../apiClient.js';
import { apiErrorMessage } from '../../../services/apiErrorMessage.js';
import useAuthStore from '../../../stores/authStore.js';
import type { HexplorerStudy } from '../../../../shared/app/models/index.js';
import { createHexplorerState, HEXPLORER_STUDY_MAX_BYTES, HEXPLORER_STUDY_MAX_NODES, type HexplorerState, type HexplorerStudyInput } from '../../../../shared/app/hexplorerStudy.js';

const LINK_COPIED_DURATION_MS = 2000;

const getRoutePublicId = (publicId: string | string[] | undefined): null | string =>
    typeof publicId === 'string' && publicId !== '' ? publicId : null;

/**
 * Study opened in Hexplorer, kept in sync with url: /hexplorer/:publicId
 *
 * @param state Analysis being edited
 * @param restoreState Replaces analysis being edited
 * @param keepsChangesOnLeave Whether changes are kept elsewhere when leaving page, so no need to confirm
 */
export const useHexplorerStudy = (
    state: Ref<HexplorerState>,
    restoreState: (data: unknown) => Promise<void>,
    keepsChangesOnLeave: () => boolean = () => false,
) => {
    const route = useRoute();
    const router = useRouter();
    const { loggedInPlayer } = storeToRefs(useAuthStore());

    /**
     * Study opened, null for a new analysis not saved yet.
     */
    const study = shallowRef<null | HexplorerStudy>(null);
    const title = ref('');

    const loading = ref(false);
    const saving = ref(false);
    const notFound = ref(false);
    const error = ref<null | string>(null);
    const linkCopied = ref(false);

    const isAuthor = computed(() => study.value !== null
        && study.value.author?.publicId !== undefined
        && study.value.author.publicId === loggedInPlayer.value?.publicId);

    /**
     * Only author can update a study. Others save their changes in a fork.
     */
    const canUpdate = computed(() => study.value === null || isAuthor.value);

    /*
     * Unsaved changes
     */

    /**
     * What is saved, except what changes by only browsing the tree.
     */
    const serializeContent = (content: HexplorerState, contentTitle: string): string => JSON.stringify(
        { ...content, title: contentTitle.trim() },
        (key, value: unknown) => ['setupMode', 'currentPlayer', 'currentNodeId'].includes(key) ? undefined : value,
    );

    const savedContent = computed<string>(() => serializeContent(state.value, title.value));

    /**
     * Null when analysis has never been saved.
     */
    const lastSavedContent = ref<null | string>(null);

    /**
     * Compared to an empty board with default settings when analysis has never been saved.
     */
    const hasUnsavedChanges = computed<boolean>(() => savedContent.value !== (lastSavedContent.value ?? serializeContent({
        ...createHexplorerState(state.value.boardsize),
        analyzerName: state.value.analyzerName,
    }, '')));

    /**
     * Content when page has been opened: a position opened from a game
     * or a puzzle has nothing to lose yet, even if it has never been saved.
     */
    let openedContent: null | string = null;

    const hasChangesToLose = computed<boolean>(() => hasUnsavedChanges.value && savedContent.value !== openedContent);

    /**
     * Asks player, only if needed, whether changes can be lost.
     */
    const confirmDiscardChanges = (): boolean => !hasChangesToLose.value || confirm(t('hexplorer.study_discard_confirm'));

    // To go away from study without asking again
    let skipLeaveConfirmation = false;

    onBeforeRouteLeave(() => skipLeaveConfirmation || keepsChangesOnLeave() || confirmDiscardChanges());

    onBeforeRouteUpdate((to, from) => to.params.publicId === from.params.publicId
        || skipLeaveConfirmation
        || confirmDiscardChanges());

    useEventListener(window, 'beforeunload', e => {
        if (hasChangesToLose.value) {
            e.preventDefault();
        }
    });

    const withoutLeaveConfirmation = async (navigate: () => Promise<unknown>): Promise<void> => {
        skipLeaveConfirmation = true;

        try {
            await navigate();
        } finally {
            skipLeaveConfirmation = false;
        }
    };

    const setStudy = (loaded: null | HexplorerStudy): void => {
        study.value = loaded;
        title.value = loaded?.title ?? '';
        lastSavedContent.value = loaded === null ? null : savedContent.value;
    };

    /**
     * Sends analysis. Player may have kept editing during request: only what has been sent is saved.
     *
     * @returns Saved study, or null if another study has been opened in the meantime: board is no longer the one saved
     */
    const persist = async (send: (input: HexplorerStudyInput) => Promise<HexplorerStudy>): Promise<null | HexplorerStudy> => {
        const sentStudy = study.value;
        const sentContent = savedContent.value;
        const input: HexplorerStudyInput = { title: title.value, data: state.value };

        if (input.data.nodes.length > HEXPLORER_STUDY_MAX_NODES || new Blob([JSON.stringify(input)]).size > HEXPLORER_STUDY_MAX_BYTES) {
            throw new Error(t('hexplorer.study_too_large'));
        }

        const saved = await send(input);

        if (study.value !== sentStudy) {
            return null;
        }

        study.value = saved;
        lastSavedContent.value = sentContent;

        return saved;
    };

    /*
     * Actions
     */

    const withSaving = async (action: () => Promise<void>): Promise<void> => {
        saving.value = true;
        error.value = null;

        try {
            await action();
        } catch (e) {
            // Rate limit is already displayed in a toast
            error.value = e instanceof Error && e.message === 'rate_limit_reached' ? null : apiErrorMessage(e);
        } finally {
            saving.value = false;
        }
    };

    // Only last request counts, responses may come back in another order
    let lastLoadRequest = 0;

    const cancelLoad = (): void => {
        ++lastLoadRequest;
        loading.value = false;
    };

    onUnmounted(cancelLoad);

    // Board is rebuilt while restoring, so one at a time
    let restoring: Promise<void> = Promise.resolve();

    const load = async (publicId: string): Promise<void> => {
        const request = ++lastLoadRequest;
        const isStale = (): boolean => request !== lastLoadRequest;

        loading.value = true;
        notFound.value = false;
        error.value = null;

        try {
            const loaded = await apiGetHexplorerStudy(publicId);

            if (isStale()) {
                return;
            }

            if (loaded === null) {
                setStudy(null);
                notFound.value = true;
                return;
            }

            const restored = restoring.then(async () => {
                if (!isStale()) {
                    await restoreState(loaded.data);
                    setStudy(loaded);
                }
            });

            restoring = restored.catch(() => undefined);

            await restored;
        } catch (e) {
            if (!isStale()) {
                error.value = apiErrorMessage(e);
            }
        } finally {
            if (!isStale()) {
                loading.value = false;
            }
        }
    };

    /**
     * Saves a new study from current analysis, and goes to its url.
     */
    const create = async (forkedFromPublicId?: string): Promise<void> => {
        const created = await persist(input => apiPostHexplorerStudy({ ...input, forkedFromPublicId }));

        if (created !== null) {
            await withoutLeaveConfirmation(() => router.replace({ name: 'hexplorer', params: { publicId: created.publicId } }));
        }
    };

    /**
     * Updates study, or creates one if there is no study opened.
     * Only author can update a study, others have to fork.
     */
    const save = (): Promise<void> => withSaving(async () => {
        if (study.value === null) {
            await create();
            return;
        }

        const { publicId } = study.value;

        await persist(input => apiPutHexplorerStudy(publicId, input));
    });

    /**
     * Saves current analysis, with its changes, as a new study of current player.
     */
    const fork = (): Promise<void> => withSaving(() => create(study.value?.publicId));

    /**
     * Forgets study, but keeps current analysis.
     * Does not ask anything, see confirmDiscardChanges().
     */
    const closeStudy = async (): Promise<void> => {
        setStudy(null);
        notFound.value = false;

        if (getRoutePublicId(route.params.publicId) !== null) {
            await withoutLeaveConfirmation(() => router.push({ name: 'hexplorer' }));
        }
    };

    const remove = (): Promise<void> => withSaving(async () => {
        if (study.value === null) {
            return;
        }

        // Nothing to lose in an empty tree
        if (state.value.nodes.length > 1 && !confirm(t('hexplorer.study_delete_confirm'))) {
            return;
        }

        await apiDeleteHexplorerStudy(study.value.publicId);
        await closeStudy();
    });

    const copyLink = async (): Promise<void> => {
        if (study.value === null) {
            return;
        }

        const { href } = router.resolve({ name: 'hexplorer', params: { publicId: study.value.publicId } });

        await navigator.clipboard.writeText(new URL(href, location.origin).href);

        linkCopied.value = true;
        setTimeout(() => linkCopied.value = false, LINK_COPIED_DURATION_MS);
    };

    // Studies can only be restored on a mounted board
    let boardReady = false;

    // Route also changes when leaving page, e.g to a puzzle, which has a publicId too
    watch(() => route.params.publicId, async value => {
        if (!boardReady || route.name !== 'hexplorer') {
            return;
        }

        cancelLoad();

        const routePublicId = getRoutePublicId(value);

        if (routePublicId === (study.value?.publicId ?? null)) {
            return;
        }

        if (routePublicId === null) {
            await closeStudy();
        } else {
            await load(routePublicId);
        }
    });

    /**
     * To call once board is mounted: loads study from url, then follows url.
     */
    const init = async (): Promise<void> => {
        boardReady = true;

        const publicId = getRoutePublicId(route.params.publicId);

        if (publicId !== null) {
            await load(publicId);
        }

        openedContent = savedContent.value;
    };

    return {
        study,
        title,
        loading,
        saving,
        notFound,
        error,
        linkCopied,
        isAuthor,
        canUpdate,
        hasUnsavedChanges,
        init,
        save,
        fork,
        remove,
        copyLink,
        closeStudy,
        confirmDiscardChanges,
    };
};

/**
 * Gives sidebar tabs access to the study of the page.
 */
export const hexplorerStudyKey: InjectionKey<ReturnType<typeof useHexplorerStudy>> = Symbol('hexplorerStudy');
