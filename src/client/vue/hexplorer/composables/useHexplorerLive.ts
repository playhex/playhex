import { computed, InjectionKey, onBeforeUnmount, ref, Ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import useHexplorerLiveHostStore from '../../../stores/hexplorerLiveHostStore.js';
import type { HexplorerMatchCreateInput } from '../../../../shared/app/hexplorerLive.js';
import type { useHexplorer } from './useHexplorer.js';
import { useHexplorerLiveSync } from './useHexplorerLiveSync.js';

export const hexplorerLiveUrl = (publicId: string): string => `${window.location.origin}/hexplorer/live/${publicId}`;

/**
 * Loading state of a button action.
 */
export const useLoadingAction = () => {
    const loading = ref(false);

    const run = async (action: () => Promise<unknown>): Promise<void> => {
        loading.value = true;

        try {
            await action();
        } finally {
            loading.value = false;
        }
    };

    return { loading, run };
};

/**
 * Host side of a Hexplorer live session, from the Hexplorer page:
 * streams the analysis, edited with invited editors, starts matches from current position,
 * and adds played matches as variations.
 *
 * Session is kept in a store, so it keeps running when host leaves the page.
 * Analysis is only broadcasted while page displays the study session is hosted from.
 *
 * @param getBoardElement Element where analysis board is mounted, to track cursor
 * @param studyPublicId Study opened by host, if authored by host. Session has same publicId, so its link never changes
 * @param saveStudy Saves analysis as a study of host when there is none, resolves to its publicId, or null if it could not be saved
 */
export const useHexplorerLiveHost = (
    hexplorer: ReturnType<typeof useHexplorer>,
    getBoardElement: () => null | HTMLElement,
    studyPublicId: Ref<null | string>,
    saveStudy: () => Promise<null | string>,
) => {
    const store = useHexplorerLiveHostStore();
    const storeRefs = storeToRefs(store);
    const { publicId, active, streaming, match, matchVariation, keptState } = storeRefs;

    /**
     * Session is hosted from another study than the one displayed:
     * host must go back to it, or stop it, to go live from this one.
     */
    const liveElsewhere = computed(() => active.value && publicId.value !== studyPublicId.value);

    /**
     * Displayed study is the one session is hosted from.
     */
    const isLive = computed(() => active.value && !liveElsewhere.value);

    store.pageOpened = true;

    onBeforeUnmount(() => {
        if (isLive.value) {
            keptState.value = { studyPublicId: publicId.value!, state: JSON.parse(JSON.stringify(hexplorer.state.value)) };
        }

        store.pageOpened = false;
    });

    /**
     * Whether analysis kept when host left is being restored: nothing is broadcasted meanwhile.
     */
    const restoringKeptState = ref(false);

    // Back on live study, loaded as last saved: restore it as it was when host left.
    // Declared before broadcasting watcher, so that saved version is never broadcasted.
    watch(studyPublicId, async studyId => {
        const kept = keptState.value;

        if (kept === null || kept.studyPublicId !== studyId) {
            return;
        }

        keptState.value = null;
        restoringKeptState.value = true;

        try {
            await hexplorer.restoreState(kept.state);
        } finally {
            restoringKeptState.value = false;
        }
    });

    // Broadcasts while streaming the displayed study, and applies changes of editors, then analyzes them.
    // Also resumes when host is back on it, or after reconnection
    const sync = useHexplorerLiveSync(
        hexplorer,
        publicId,
        storeRefs.session,
        computed(() => streaming.value && isLive.value && !restoringKeptState.value ? 'edit' : 'off'),
        getBoardElement,
        true,
    );

    store.setLiveHandlers(sync.handlers);
    onBeforeUnmount(() => store.setLiveHandlers({}));

    // Add match to analysis once it ended, possibly when host is back on its study
    watch([matchVariation, studyPublicId, restoringKeptState], ([variation, studyId, restoring]) => {
        if (variation !== null && variation.studyPublicId === studyId && !restoring) {
            hexplorer.addMatchVariation(variation.startNodeId, variation.moves);
            matchVariation.value = null;
        }
    }, { immediate: true });

    /**
     * Whether host is looking at the match board instead of analysis.
     * Shown when a match starts, host can go back to analysis meanwhile.
     * Kept after match ended to see the result, until host goes back to analysis.
     */
    const showMatchBoard = ref(false);

    watch(match, (current, previous) => {
        if (current !== null && current.state !== 'ended' && (!previous || previous.state === 'ended')) {
            showMatchBoard.value = true;
        }
    }, { immediate: true });

    const getStudyPublicId = async (): Promise<null | string> => studyPublicId.value ?? await saveStudy();

    const startStream = async (): Promise<boolean> => {
        const id = await getStudyPublicId();

        return id !== null && await store.startStream(id);
    };

    /**
     * Starts a match from position currently displayed.
     */
    const createMatch = async (options: Omit<HexplorerMatchCreateInput, 'startPosition'>): Promise<boolean> => {
        const startPosition = hexplorer.getMatchStartPosition();
        const startNodeId = hexplorer.currentNodeId.value;
        const id = startPosition === null ? null : await getStudyPublicId();

        if (startPosition === null || id === null) {
            return false;
        }

        const created = await store.createMatch(id, startNodeId, { ...options, startPosition });

        if (!created) {
            // e.g bot went offline: grey it out
            void hexplorer.refreshEnginesStatus();
        }

        return created;
    };

    return {
        ...storeRefs,
        liveElsewhere,
        isLive,
        boardMounted: sync.boardMounted,
        showMatchBoard,
        startStream,
        createMatch,
        stopStream: store.stopStream,
        inviteEditor: store.inviteEditor,
        removeEditor: store.removeEditor,
        joinMatch: store.joinMatch,
        playMatchMove: store.playMatchMove,
        resignMatch: store.resignMatch,
    };
};

/**
 * Chat channel of the live session shown on the page, if any.
 * Ctrl+click on a tree node pastes its mention in this chat input.
 */
export const hexplorerLiveChatChannelKey: InjectionKey<Ref<null | string>> = Symbol('hexplorerLiveChatChannel');

export const hexplorerLiveHostKey: InjectionKey<ReturnType<typeof useHexplorerLiveHost>> = Symbol('hexplorerLiveHost');
