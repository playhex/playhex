import { Move, Player, PlayerGameInput } from '../shared/game-engine';

const noInputError = new Error('No player input, cannot continue');

export default class RemoteApiPlayer extends Player
{
    constructor(
        private name: string,
        private endpoint: string,
    ) {
        super();

        this.on('myTurnToPlay', () => this.makeMove());
    }

    getName(): string
    {
        return this.name;
    }

    private async fetchMove(): Promise<null | Move>
    {
        if (!this.playerGameInput) {
            throw noInputError;
        }

        const response = await fetch(this.endpoint, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                size: this.playerGameInput.getSize(),
                currentColor: this.playerGameInput.getPlayerIndex() ? 'white' : 'black',
                movesHistory: this.playerGameInput
                    .getMovesHistory()
                    .map(move => move.toString())
                    .join(' ')
                ,
            }),
        });

        const moveString = await response.text();

        const match = moveString.match(/^"?([a-z])(\d+)"?$/);

        if (null === match) {
            console.error(`Unexpected api output: "${moveString}"`);
            return null;
        }

        const [, letter, number] = match;

        return new Move(
            letter.charCodeAt(0) - 97, // "a" is 0
            parseInt(number, 10) - 1, // "1" is 0
        );
    }

    setPlayerGameInput(playerGameInput: PlayerGameInput): void
    {
        super.setPlayerGameInput(playerGameInput);
        this.setReady();
    }

    private async makeMove(): Promise<void>
    {
        const move = await this.fetchMove();

        if (!this.playerGameInput) {
            throw noInputError;
        }

        if (null === move) {
            console.error('AI resigns because did not provided valid move');
            this.playerGameInput.resign();
            return;
        }

        this.playerGameInput.move(move);
    }
}
