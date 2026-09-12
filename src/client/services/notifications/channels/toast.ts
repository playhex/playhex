import useToastsStore from '../../../../client/stores/toastsStore.js';
import { apiPostCancel } from '../../../apiClient.js';
import { getCurrentPlayer, getOtherPlayer, isBotGame } from '../../../../shared/app/gameUtils.js';
import { pseudoString } from '../../../../shared/app/pseudoUtils.js';
import { getOpponent, iAmInGame, isMe, viewingGame } from '../../context-utils.js';
import { notifier } from '../notifier.js';
import { t } from 'i18next';
import { IconPersonFillExclamation, IconTablerSwords } from '../../../vue/icons.js';

notifier.on('gameStart', game => {
    if (isBotGame(game)) {
        return;
    }

    if (viewingGame(game)) {
        return;
    }

    if (game.host === null) {
        // If no host, notify if I am in the game
        if (!iAmInGame(game)) {
            return;
        }
    } else {
        // Do not notify player who just joined, because he is now aware that game started obviously
        if (!isMe(game.host)) {
            return;
        }
    }

    const opponent = getOpponent(game);

    if (opponent === null) {
        return;
    }

    useToastsStore().addToast(
        t('game_with_player_has_started', { player: pseudoString(opponent, 'pseudo') }),
        {
            level: 'success',
            autoCloseAfter: 0,
            closable: true,
            icon: IconPersonFillExclamation,
            actions: [
                { label: t('go_to_the_game'), action: {
                    name: 'online-game',
                    params: { gameId: game.publicId },
                } },
            ],
        },
    );
});

// Toast when my opponent passed, or, if I'm watching, any player passed
notifier.on('move', (game, timestampedMove) => {
    if (timestampedMove.move !== 'pass') {
        return;
    }

    const currentPlayer = getCurrentPlayer(game);

    if (currentPlayer === null) {
        return;
    }

    const passingPlayer = getOtherPlayer(game, currentPlayer);

    if (passingPlayer === null || isMe(passingPlayer)) {
        return;
    }

    useToastsStore().addToast(
        t('player_passed_his_turn', { player: pseudoString(passingPlayer, 'pseudo') }),
        {
            level: 'warning',
        },
    );
});

notifier.on('takebackRequested', (game, byPlayer) => {
    // Only display to watchers: players see the takeback request bar above the board
    if (iAmInGame(game)) {
        return;
    }

    useToastsStore().addToast(
        t('undo.player_wants_to_takeback', { player: pseudoString(byPlayer, 'pseudo') }),
        {
            level: 'warning',
        },
    );
});

notifier.on('takebackAnswered', (game, accepted, playerTakeback) => {
    const opponent = getOtherPlayer(game, playerTakeback);

    // Only display to player who requested takeback and watchers (so: everyone except playerTakeback's opponent)
    if (opponent && isMe(opponent)) {
        return;
    }

    if (accepted) {
        useToastsStore().addToast(
            t('undo.player_takeback_his_move', { player: pseudoString(playerTakeback, 'pseudo') }),
            { level: 'success' },
        );
    } else {
        useToastsStore().addToast(
            t('undo.takeback_request_denied', { player: pseudoString(playerTakeback, 'pseudo') }),
            { level: 'danger' },
        );
    }
});

notifier.on('gameChallengeCreated', game => {
    if (game.host === null) {
        return;
    }

    useToastsStore().addToast(
        t('player_challenged_you', { player: pseudoString(game.host, 'pseudo') }),
        {
            level: 'success',
            autoCloseAfter: 0,
            closable: true,
            icon: IconTablerSwords,
            actions: [
                { label: t('go_to_the_game'), action: {
                    name: 'online-game',
                    params: { gameId: game.publicId },
                } },
                { label: t('decline_challenge'), classes: 'btn btn-sm btn-outline-warning', action: () => {
                    void apiPostCancel(game.publicId);
                } },
            ],
        },
    );
});

notifier.on('rematchOffer', game => {
    const rematchRequester = game.rematch?.host;

    if (!rematchRequester) {
        return;
    }

    // Displays a toast to opponent
    if (isMe(rematchRequester)) {
        return;
    }

    if (iAmInGame(game)) {
        useToastsStore().addToast(
            t('player_sent_you_rematch_offer', { player: pseudoString(rematchRequester, 'pseudo') }),
            { level: 'success' },
        );
    } else {
        useToastsStore().addToast(
            t('player_sent_rematch_offer', { player: pseudoString(rematchRequester, 'pseudo') }),
            { level: 'info' },
        );
    }
});
