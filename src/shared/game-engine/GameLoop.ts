import { Game, IllegalMove } from '.';
import GameInput from './GameInput';

export default class GameLoop
{
    /**
     * Must be run where the game is hosted.
     * So only server side for remote game,
     * and only client side for offline game.
     */
    static async run(game: Game): Promise<void>
    {
        if (game.isEnded()) {
            console.log('Running an ended game, noop');
            return;
        }

        console.log('waiting for all players ready...');

        await Promise.all(game.getPlayers().map(player => player.isReady()));

        console.log('all players ready.');

        game.start();

        while (!game.isEnded()) {
            await GameLoop.makeCurrentPlayerPlay(game);
        }

        console.log('game has ended, game loop stops.');
    }

    static async makeCurrentPlayerPlay(game: Game): Promise<void>
    {
        const currentPlayerIndex = game.getCurrentPlayerIndex();
        const currentPlayer = game.getPlayers()[currentPlayerIndex];

        console.log('await for player move', currentPlayerIndex);

        try {
            const move = await currentPlayer.playMove(new GameInput(game));

            game.move(move);
        } catch (e) {
            if (e instanceof IllegalMove) {
                game.abandon();
                console.log('you lose because provided an invalid move:', e.message);
            } else {
                throw e;
            }
        }
    }
}
