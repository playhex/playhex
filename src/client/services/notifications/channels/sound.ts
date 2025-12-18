import { iAmInGame, isMe, isMyTurn, viewingGame } from '../context-utils.js';
import { notifier } from '../notifier.js';
import { playAudio } from '../../../../shared/app/audioPlayer.js';
import { getLoserPlayer, isBotGame } from '../../../../shared/app/hostedGameUtils.js';

function playAudioIfNotMuted(filename: string): void {
    // TODO: THIS IS STILL BAD
    if (JSON.parse(localStorage?.getItem('hex-local-settings') || '').muteAudio){return};
    playAudio(filename);
}

notifier.on('gameStart', (hostedGame) => {
    if (!(
        iAmInGame(hostedGame)
    )) {
        return;
    }

    playAudioIfNotMuted('/sounds/lisp/GenericNotify.ogg');
});

notifier.on('gameEnd', (hostedGame) => {
    if (!(
        iAmInGame(hostedGame) || viewingGame(hostedGame)
    )) {
        return;
    }

    const loser = getLoserPlayer(hostedGame);

    if (loser === null) {
        playAudioIfNotMuted('/sounds/lisp/GenericNotify.ogg');
        return;
    }

    if (isMe(loser)) {
        playAudioIfNotMuted('/sounds/lisp/Defeat.ogg');
    } else {
        playAudioIfNotMuted('/sounds/lisp/Victory.ogg');
    }
});

notifier.on('chatMessage', (hostedGame, chatMessage) => {
    if (!viewingGame(hostedGame)) {
        return;
    }

    if (chatMessage.player === null) {
        return;
    }

    if (isMe(chatMessage.player)) {
        return;
    }

    playAudioIfNotMuted('/sounds/lisp/NewPM.ogg');
});

notifier.on('gameTimeControlWarning', (hostedGame) => {
    if (!isMyTurn(hostedGame)) {
        return;
    }

    playAudioIfNotMuted('/sounds/lisp/LowTime.ogg');
});

notifier.on('rematchOffer', hostedGame => {
    // Play sound to both players in game
    if (!iAmInGame(hostedGame)) {
        return;
    }

    // Only play sound for 1v1 games
    if (isBotGame(hostedGame)) {
        return;
    }

    playAudioIfNotMuted('/sounds/lisp/NewChallenge.ogg');
});
