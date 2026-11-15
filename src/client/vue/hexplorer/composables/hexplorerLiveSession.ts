import { computed, MaybeRefOrGetter, onBeforeUnmount, Ref, shallowRef, toValue, watch } from 'vue';
import type { HexMove } from '@playhex/move-notation';
import useSocketStore from '../../../stores/socketStore.js';
import useAuthStore from '../../../stores/authStore.js';
import Rooms from '../../../../shared/app/Rooms.js';
import {
    canEditHexplorerLive,
    canJoinMatch,
    getMatchPlayerColor,
    getMatchPosition,
    type HexplorerLiveCursor,
    type HexplorerLiveSession,
    type HexplorerLiveSnapshot,
    type HexplorerMatch,
} from '../../../../shared/app/hexplorerLive.js';
import type { WebsocketActionError } from '../../../../shared/app/Types.js';

export type HexplorerLiveSessionHandlers = {
    onSnapshot?: (snapshot: HexplorerLiveSnapshot, revision: number) => void;
    onCursor?: (playerPublicId: string, cursor: HexplorerLiveCursor) => void;
};

/**
 * Follows a Hexplorer live session: session state, match, streamed analysis and cursors.
 * Used by host, editors and viewers. Not bound to a component: call stop() to stop following.
 *
 * @param handlers Read on each event, so can be changed later.
 *                 Only receive events: snapshot of an updated session is in `session`.
 */
export const followHexplorerLiveSession = (
    publicId: Ref<null | string>,
    handlers: MaybeRefOrGetter<HexplorerLiveSessionHandlers> = {},
) => {
    const socketStore = useSocketStore();
    const { socket } = socketStore;
    const authStore = useAuthStore();

    /**
     * Undefined while not yet loaded, null if session does not exist (anymore).
     */
    const session = shallowRef<undefined | null | HexplorerLiveSession>(undefined);
    const match = shallowRef<null | HexplorerMatch>(null);

    let leaveRoom: null | (() => void) = null;

    watch(publicId, id => {
        session.value = undefined;
        match.value = null;
        leaveRoom?.();
        leaveRoom = id === null ? null : socketStore.subscribeRoom(Rooms.hexplorerLive(id));
    }, { immediate: true });

    /**
     * Ignores events of other sessions.
     */
    const forThisSession = <A extends unknown[]>(handler: (...args: A) => void) => (id: string, ...args: A): void => {
        if (id === publicId.value) {
            handler(...args);
        }
    };

    const onUpdate = forThisSession((updated: null | HexplorerLiveSession) => {
        // An ended session is the same as no session, but its last match is still displayed
        session.value = updated?.ended ? null : updated;
        match.value = updated?.match ?? null;
    });

    const onSnapshot = forThisSession((revision: number, snapshot: HexplorerLiveSnapshot) => toValue(handlers).onSnapshot?.(snapshot, revision));
    const onCursor = forThisSession((playerPublicId: string, cursor: HexplorerLiveCursor) => toValue(handlers).onCursor?.(playerPublicId, cursor));
    const onMatchUpdate = forThisSession((updated: HexplorerMatch) => {
        match.value = updated;
    });

    socket.on('hexplorerLiveUpdate', onUpdate);
    socket.on('hexplorerLiveSnapshot', onSnapshot);
    socket.on('hexplorerLiveCursor', onCursor);
    socket.on('hexplorerMatchUpdate', onMatchUpdate);

    const stop = (): void => {
        leaveRoom?.();
        socket.off('hexplorerLiveUpdate', onUpdate);
        socket.off('hexplorerLiveSnapshot', onSnapshot);
        socket.off('hexplorerLiveCursor', onCursor);
        socket.off('hexplorerMatchUpdate', onMatchUpdate);
    };

    /**
     * Emits an action, resolves to whether it succeeded. Errors are displayed in a toast.
     */
    const action = (emit: (answer: (error?: WebsocketActionError) => void) => void): Promise<boolean> => new Promise(resolve => {
        emit(error => {
            if (error) {
                socketStore.handleMessageError(error);
            }

            resolve(!error);
        });
    });

    /**
     * My color in match, null if I am not playing.
     */
    const myColor = computed<null | 0 | 1>(() => {
        const player = authStore.loggedInPlayer;

        return match.value === null || player === null ? null : getMatchPlayerColor(match.value, player.publicId);
    });

    const canJoin = computed<boolean>(() => {
        const player = authStore.loggedInPlayer;

        return match.value !== null && player !== null && canJoinMatch(match.value, player);
    });

    const isMyTurn = computed<boolean>(() => match.value !== null
        && match.value.state === 'playing'
        && myColor.value !== null
        && getMatchPosition(match.value).nextPlayer === myColor.value,
    );

    /**
     * Whether I can edit streamed analysis: as host or invited editor.
     */
    const canEdit = computed<boolean>(() => {
        const player = authStore.loggedInPlayer;

        return !!session.value?.streaming && player !== null && canEditHexplorerLive(session.value, player.publicId);
    });

    const joinMatch = (): Promise<boolean> => action(answer => socket.emit('hexplorerMatchJoin', publicId.value!, answer));
    const playMatchMove = (move: HexMove): Promise<boolean> => action(answer => socket.emit('hexplorerMatchMove', publicId.value!, move, answer));
    const resignMatch = (): Promise<boolean> => action(answer => socket.emit('hexplorerMatchResign', publicId.value!, answer));

    return {
        session,
        match,
        myColor,
        canJoin,
        isMyTurn,
        canEdit,
        action,
        joinMatch,
        playMatchMove,
        resignMatch,
        stop,
    };
};

/**
 * Follows a Hexplorer live session while component is mounted.
 */
export const useHexplorerLiveSession = (...args: Parameters<typeof followHexplorerLiveSession>) => {
    const followed = followHexplorerLiveSession(...args);

    onBeforeUnmount(followed.stop);

    return followed;
};
