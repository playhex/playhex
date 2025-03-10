import { iAmInGame, isMe, isMyTurn, viewingGame } from '../context-utils';
import { notifier } from '../notifier';
import { playAudio } from '../../../../shared/app/audioPlayer';
import { getLoserPlayer } from '../../../../shared/app/hostedGameUtils';

notifier.on('gameStart', (hostedGame) => {
    if (!(
        iAmInGame(hostedGame)
    )) {
        return;
    }

    playAudio('/sounds/lisp/GenericNotify.ogg');
});

notifier.on('gameEnd', (hostedGame) => {
    if (!(
        iAmInGame(hostedGame) || viewingGame(hostedGame)
    )) {
        return;
    }

    const loser = getLoserPlayer(hostedGame);

    if (null === loser) {
        playAudio('/sounds/lisp/GenericNotify.ogg');
        return;
    }

    if (isMe(loser)) {
        playAudio('/sounds/lisp/Defeat.ogg');
    } else {
        playAudio('/sounds/lisp/Victory.ogg');
    }
});

notifier.on('chatMessage', (hostedGame, chatMessage) => {
    if (!viewingGame(hostedGame)) {
        return;
    }

    if (null === chatMessage.player) {
        return;
    }

    if (isMe(chatMessage.player)) {
        return;
    }

    playAudio('/sounds/lisp/NewPM.ogg');
});

notifier.on('gameTimeControlWarning', (hostedGame) => {
    if (!isMyTurn(hostedGame)) {
        return;
    }

    playAudio('/sounds/lisp/LowTime.ogg');
});
