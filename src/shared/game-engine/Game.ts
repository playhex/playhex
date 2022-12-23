import EventEmitter from 'events';
import { IllegalMove, PlayerInterface, PlayerIndex, Move } from '.';
import TypedEmitter from 'typed-emitter';
import { Side } from './Types';

type GameEvents = {
    /**
     * A game started can accept moves.
     */
    started: () => void;

    /**
     * A move have been played by a player. PlayerIndex is the player who made the move.
     */
    played: (move: Move, byPlayerIndex: PlayerIndex) => void;

    /**
     * Game have been finished.
     */
    ended: (winner: PlayerIndex) => void;
};

export default class Game extends (EventEmitter as unknown as new () => TypedEmitter<GameEvents>)
{
    private hexes: (null|PlayerIndex)[][];
    private started: boolean = false;
    private currentPlayerIndex: PlayerIndex = 0;
    private winner: null|PlayerIndex = null;

    public constructor(
        private players: [PlayerInterface, PlayerInterface],
        private size: number = 11,
    ) {
        super();

        this.hexes = Array(this.size)
            .fill([])
            .map(() => Array(this.size).fill(null))
        ;
    }

    public getSize(): number
    {
        return this.size;
    }

    public getPlayers(): [PlayerInterface, PlayerInterface]
    {
        return this.players;
    }

    public getPlayer(playerIndex: PlayerIndex): PlayerInterface
    {
        return this.players[playerIndex];
    }

    public getCurrentPlayerIndex(): PlayerIndex
    {
        return this.currentPlayerIndex;
    }

    public setCurrentPlayerIndex(currentPlayerIndex: PlayerIndex): void
    {
        this.currentPlayerIndex = currentPlayerIndex;
    }

    public getCurrentPlayer(): PlayerInterface
    {
        return this.players[this.currentPlayerIndex];
    }

    public hasWinner(): boolean
    {
        return null !== this.winner;
    }

    public isEnded(): boolean
    {
        return null !== this.winner;
    }

    public getStrictWinner(): PlayerIndex
    {
        if (null === this.winner) {
            throw new Error('Trying to strictly get the winner but game not finished');
        }

        return this.winner;
    }

    public setWinner(playerIndex: PlayerIndex): void
    {
        if (null !== this.winner) {
            throw new Error('Cannot set a winner again, there is already a winner');
        }

        this.winner = playerIndex;

        this.emit('ended', playerIndex);
    }

    public getCells(): (null|PlayerIndex)[][]
    {
        return this.hexes;
    }

    public getCellsClone(): (null|PlayerIndex)[][]
    {
        return this.hexes.map(row => row.slice());
    }

    public getCell(row: number, col: number): null|PlayerIndex
    {
        return this.hexes[row][col];
    }

    public isEmpty(row: number, col: number): boolean
    {
        return null === this.hexes[row][col];
    }

    public isCellCoordsValid(row: number, col: number): boolean
    {
        return row >= 0 && row < this.size && col >= 0 && col < this.size;
    }

    /**
     * Set a cell to a value.
     * Should be called after server update events.
     * Do not check the move nor change the game state.
     * Should call move() instead to play the game.
     */
    public setCell(move: Move, value: PlayerIndex): void
    {
        this.hexes[move.getRow()][move.getCol()] = value;

        this.emit('played', move, value);

        if (this.hasPlayerConnection(this.currentPlayerIndex)) {
            this.setWinner(this.currentPlayerIndex);
            return;
        }
    }

    public start(): void
    {
        if (this.started) {
            throw new Error('Game already started');
        }

        this.started = true;

        this.emit('started');
    }

    /**
     * @throws IllegalMove on invalid move.
     */
    public checkMove(move: Move): void
    {
        if (!this.started) {
            throw new IllegalMove('Game is not yet started');
        }

        if (this.isEnded()) {
            throw new IllegalMove('Game is over');
        }

        if (!this.isCellCoordsValid(move.getRow(), move.getCol())) {
            throw new IllegalMove('Cell outside board');
        }

        if (!this.isEmpty(move.getRow(), move.getCol())) {
            throw new IllegalMove('This cell is already occupied');
        }
    }

    /**
     * Validate and make current play move, and change player.
     *
     * @throws IllegalMove on invalid move.
     */
    public move(move: Move): void
    {
        this.checkMove(move);

        this.setCell(move, this.currentPlayerIndex);

        this.changeCurrentPlayer();
    }

    /**
     * Makes current player abandon
     */
    public abandon(): void
    {
        this.changeCurrentPlayer();
        this.setWinner(this.currentPlayerIndex);
    }

    public otherPlayerIndex(): PlayerIndex
    {
        return 0 === this.currentPlayerIndex
            ? 1
            : 0
        ;
    }

    private changeCurrentPlayer(): void
    {
        this.currentPlayerIndex = this.otherPlayerIndex();
    }

    public getConnection(): null|PlayerIndex
    {
        if (this.hasPlayerConnection(0)) {
            return 0;
        }

        if (this.hasPlayerConnection(1)) {
            return 1;
        }

        return null;
    }

    public hasPlayerConnection(playerIndex: PlayerIndex): boolean
    {
        const hash = (row: number, col: number): string => row + '_' + col;

        const visited: {[key: string]: true} = {};
        const frontier: [number, number][] = [];

        if (0 === playerIndex) {
            for (let i = 0; i < this.size; ++i) {
                if (playerIndex === this.hexes[i][0]) {
                    frontier.push([i, 0]);
                    visited[hash(i, 0)] = true;
                }
            }
        } else {
            for (let i = 0; i < this.size; ++i) {
                if (playerIndex === this.hexes[0][i]) {
                    frontier.push([0, i]);
                    visited[hash(0, i)] = true;
                }
            }
        }

        let current: undefined|[number, number];

        while (current = frontier.shift()) {
            if (
                0 === playerIndex && this.isCellOnSide(current[0], current[1], 'RIGHT') ||
                1 === playerIndex && this.isCellOnSide(current[0], current[1], 'BOTTOM')
            ) {
                return true;
            }

            visited[hash(...current)] = true;

            this
                .getNeighboors(...current)
                .forEach(cell => {
                    if (this.hexes[cell[0]][cell[1]] === playerIndex && !visited[hash(...cell)]) {
                        frontier.push(cell);
                    }
                })
            ;
        }

        return false;
    }

    public inBoard(row: number, col: number): boolean
    {
        return row >= 0 && row < this.size
            && col >= 0 && col < this.size
        ;
    }

    public isCellOnSide(row: number, col: number, side: Side): boolean
    {
        switch (side) {
            case 'TOP': return 0 === row;
            case 'LEFT': return 0 === col;
            case 'BOTTOM': return this.size - 1 === row;
            case 'RIGHT': return this.size - 1 === col;
        }
    }

    public getNeighboors(row: number, col: number): [number, number][]
    {
        const neighboors: [number, number][] = [
            [row, col - 1],
            [row, col + 1],

            [row - 1, col],
            [row - 1, col + 1],

            [row + 1, col],
            [row + 1, col - 1],
        ];

        return neighboors
            .filter(cell => this.inBoard(cell[0], cell[1]))
        ;
    }
}
