import AppPlayer from '../app/AppPlayer';
import IllegalMove from './IllegalMove';
import Move from './Move';
import { v4 as uuidv4 } from 'uuid';

const { floor, random } = Math;

/**
 * TODO AppPlayer cannot be in game-engine package
 */
export default class RandomAIPlayer extends AppPlayer
{
    private static NAME = 'Random bot';
    private static WAIT_BEFORE_PLAY = 80;

    constructor()
    {
        super({
            publicId: 'random-bot|' + uuidv4(),
            pseudo: RandomAIPlayer.NAME,
            isBot: true,
            isGuest: false,
        });

        this.on('myTurnToPlay', async () => {
            try {
                await this.makeMove();
            } catch (e) {
                if (e instanceof IllegalMove) {
                    console.warn(e.message);
                } else {
                    throw e;
                }
            }
        });
    }

    getName(): string
    {
        return RandomAIPlayer.NAME;
    }

    async makeMove(): Promise<void>
    {
        console.log('random AI player is playing…');

        if (RandomAIPlayer.WAIT_BEFORE_PLAY > 0) {
            await new Promise(resolve => {
                setTimeout(resolve, RandomAIPlayer.WAIT_BEFORE_PLAY);
            });
        }

        if (null === this.playerGameInput) {
            throw new Error('Cannot move, no player game input provided.');
        }

        const possibleMoves: Move[] = [];

        for (let row = 0; row < this.playerGameInput.getSize(); ++row) {
            for (let col = 0; col < this.playerGameInput.getSize(); ++col) {
                if (null === this.playerGameInput.getHex(row, col)) {
                    possibleMoves.push(new Move(row, col));
                }
            }
        }

        const move = possibleMoves[floor(random() * possibleMoves.length)];

        this.playerGameInput.move(move);
    }
}
