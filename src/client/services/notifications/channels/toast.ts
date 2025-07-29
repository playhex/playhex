import useToastsStore from '../../../../client/stores/toastsStore.js';
import { getCurrentPlayer, getOtherPlayer, isBotGame } from '../../../../shared/app/hostedGameUtils.js';
import { pseudoString } from '../../../../shared/app/pseudoUtils.js';
import { Toast } from '../../../../shared/app/Toast.js';
import { getOpponent, iAmInGame, isMe, viewingGame } from '../context-utils.js';
import { notifier } from '../notifier.js';
import { t } from 'i18next';

notifier.on('gameStart', hostedGame => {
    if (isBotGame(hostedGame)) {
        return;
    }

    if (viewingGame(hostedGame)) {
        return;
    }

    if (hostedGame.host === null) {
        // If no host, notify if I am in the game
        if (!iAmInGame(hostedGame)) {
            return;
        }
    } else {
        // Do not notify player who just joined, because he is now aware that game started obviously
        if (!isMe(hostedGame.host)) {
            return;
        }
    }

    const opponent = getOpponent(hostedGame);

    if (opponent === null) {
        return;
    }

    useToastsStore().addToast(new Toast(
        t('game_with_player_has_started', { player: pseudoString(opponent, 'pseudo') }),
        {
            level: 'success',
            autoCloseAfter: 10000,
            actions: [
                { label: t('go_to_the_game'), action: {
                    name: 'online-game',
                    params: { gameId: hostedGame.publicId },
                } },
            ],
        },
    ));
});

// Toast when my opponent passed, or, if I'm watching, any player passed
notifier.on('move', (hostedGame, move) => {
    if (move.specialMoveType !== 'pass') {
        return;
    }

    const currentPlayer = getCurrentPlayer(hostedGame);

    if (currentPlayer === null) {
        return;
    }

    const passingPlayer = getOtherPlayer(hostedGame, currentPlayer);

    if (passingPlayer === null || isMe(passingPlayer)) {
        return;
    }

    if (move.specialMoveType === 'pass') {
        useToastsStore().addToast(new Toast(
            t('player_passed_his_turn', { player: pseudoString(passingPlayer, 'pseudo') }),
            {
                level: 'warning',
            },
        ));
    }
});
