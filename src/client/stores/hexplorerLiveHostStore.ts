import { defineStore } from 'pinia';
import { computed, ref, shallowRef, watch } from 'vue';
import type { HexMove } from '@playhex/move-notation';
import useSocketStore from './socketStore.js';
import { followHexplorerLiveSession } from '../vue/hexplorer/composables/hexplorerLiveSession.js';
import type { HexplorerMatchCreateInput } from '../../shared/app/hexplorerLive.js';
import type { HexplorerState } from '../../shared/app/hexplorerStudy.js';
import type { WebsocketActionError } from '../../shared/app/Types.js';

/**
 * Moves of a match to add as a variation, once host displays the study it has been played from.
 */
export type HexplorerMatchVariation = {
    studyPublicId: string;
    startNodeId: number;
    moves: HexMove[];
};

/**
 * Hexplorer live session hosted from this tab.
 * Kept while host browses other pages: stream and match keep running,
 * analysis is broadcasted again once host is back on the study (see useHexplorerLiveHost()).
 */
const useHexplorerLiveHostStore = defineStore('hexplorerLiveHostStore', () => {
    const socketStore = useSocketStore();
    const { socket } = socketStore;

    /**
     * Same as publicId of the study the session is hosted from.
     */
    const publicId = ref<null | string>(null);

    const { session, match, myColor, canJoin, isMyTurn, action, joinMatch, playMatchMove, resignMatch } = followHexplorerLiveSession(publicId);

    /**
     * Also true while session is loading.
     */
    const active = computed(() => publicId.value !== null && session.value !== null);
    const streaming = computed(() => session.value?.streaming ?? false);
    const matchRunning = computed(() => match.value !== null && match.value.state !== 'ended');

    /**
     * Whether Hexplorer page is opened in this tab.
     */
    const pageOpened = ref(false);

    /**
     * Analysis of live study when host left Hexplorer, with its unsaved changes,
     * restored when host comes back instead of the last saved one.
     */
    const keptState = shallowRef<null | { studyPublicId: string, state: HexplorerState }>(null);

    watch(publicId, () => keptState.value = null);

    /**
     * Creates session from a study, if not already live from it.
     * Resolves to null if session could not be created, or is already live from another study.
     */
    const ensureSession = async (studyPublicId: string): Promise<null | string> => {
        if (active.value) {
            return publicId.value === studyPublicId ? publicId.value : null;
        }

        const result = await new Promise<{ publicId: string } | WebsocketActionError>(resolve => {
            socket.emit('hexplorerLiveCreate', studyPublicId, resolve);
        });

        if ('reason' in result) {
            socketStore.handleMessageError(result);
            return null;
        }

        publicId.value = result.publicId;

        return result.publicId;
    };

    const setStreaming = (id: string, value: boolean): Promise<boolean> =>
        action(answer => socket.emit('hexplorerLiveSetStreaming', id, value, answer));

    const startStream = async (studyPublicId: string): Promise<boolean> => {
        const id = await ensureSession(studyPublicId);

        return id !== null && await setStreaming(id, true);
    };

    const endSession = (): void => {
        if (publicId.value !== null) {
            socket.emit('hexplorerLiveEnd', publicId.value);
        }

        publicId.value = null;
    };

    /**
     * Ends session, or only stops streaming while a match is played in it.
     */
    const stopStream = async (): Promise<boolean> => {
        if (publicId.value === null) {
            return true;
        }

        if (!matchRunning.value) {
            endSession();
            return true;
        }

        return await setStreaming(publicId.value, false);
    };

    let matchStart: null | Omit<HexplorerMatchVariation, 'moves'> = null;

    /**
     * Last match played, waiting to be added to analysis.
     */
    const matchVariation = shallowRef<null | HexplorerMatchVariation>(null);

    /**
     * @param startNodeId Analysis node the match starts from, to add match moves as a variation from it
     */
    const createMatch = async (studyPublicId: string, startNodeId: number, input: HexplorerMatchCreateInput): Promise<boolean> => {
        const id = await ensureSession(studyPublicId);

        if (id === null) {
            return false;
        }

        const created = await action(answer => socket.emit('hexplorerMatchCreate', id, input, answer));

        if (created) {
            matchStart = { studyPublicId: id, startNodeId };
        }

        return created;
    };

    watch(match, current => {
        if (current?.state !== 'ended' || matchStart === null) {
            return;
        }

        if (current.moves.length > 0) {
            matchVariation.value = { ...matchStart, moves: current.moves };
        }

        matchStart = null;
    });

    // Host left Hexplorer, and there is no stream nor match to keep session for
    watch(() => active.value && !pageOpened.value && !streaming.value && !matchRunning.value, idle => {
        if (idle) {
            endSession();
        }
    });

    return {
        publicId,
        session,
        match,
        myColor,
        canJoin,
        isMyTurn,
        active,
        streaming,
        matchRunning,
        pageOpened,
        keptState,
        matchVariation,
        startStream,
        stopStream,
        endSession,
        createMatch,
        joinMatch,
        playMatchMove,
        resignMatch,
    };
});

export default useHexplorerLiveHostStore;
