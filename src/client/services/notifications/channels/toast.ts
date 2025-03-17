import useToastsStore from '../../../../client/stores/toastsStore';
import { getCurrentPlayer, getOtherPlayer, isBotGame } from '../../../../shared/app/hostedGameUtils';
import { pseudoString } from '../../../../shared/app/pseudoUtils';
import { Toast } from '../../../../shared/app/Toast';
import { getOpponent, isMe, viewingGame } from '../context-utils';
import { notifier } from '../notifier';
import i18next from 'i18next';

notifier.on('gameStart', hostedGame => {
    if (isBotGame(hostedGame)) {
        return;
    }

    if (viewingGame(hostedGame)) {
        return;
    }

    // Do not notify player who just joined, because he is now aware that game started obviously
    if (!isMe(hostedGame.host)) {
        return;
    }

    const opponent = getOpponent(hostedGame);

    if (null === opponent) {
        return;
    }

    useToastsStore().addToast(new Toast(
        i18next.t('game_with_player_has_started', { player: pseudoString(opponent, 'pseudo') }),
        {
            level: 'success',
            autoCloseAfter: 10000,
            actions: [
                { label: i18next.t('go_to_the_game'), action: {
                    name: 'online-game',
                    params: { gameId: hostedGame.publicId },
                } },
            ],
        },
    ));
});

// Toast when my opponent passed, or, if I'm watching, any player passed
notifier.on('move', (hostedGame, move) => {
    if ('pass' !== move.specialMoveType) {
        return;
    }

    const currentPlayer = getCurrentPlayer(hostedGame);

    if (null === currentPlayer) {
        return;
    }

    const passingPlayer = getOtherPlayer(hostedGame, currentPlayer);

    if (null === passingPlayer || isMe(passingPlayer)) {
        return;
    }

    if ('pass' === move.specialMoveType) {
        useToastsStore().addToast(new Toast(
            i18next.t('player_passed_his_turn', { player: pseudoString(passingPlayer, 'pseudo') }),
            {
                level: 'warning',
            },
        ));
    }
});
