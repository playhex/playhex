import { Game, IllegalMove } from '.';
import GameInput from './GameInput';

export default class GameLoop
{
    public static async run(game: Game): Promise<void>
    {
        if (game.isEnded()) {
            console.log('Running an ended game, noop');
            return;
        }

        while (!game.isEnded()) {
            await GameLoop.makeCurrentPlayerPlay(game);
        }
    }

    public static async makeCurrentPlayerPlay(game: Game): Promise<void>
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
