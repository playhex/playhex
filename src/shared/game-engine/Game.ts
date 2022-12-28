import EventEmitter from 'events';
import { IllegalMove, PlayerInterface, PlayerIndex, Move } from '.';
import TypedEmitter from 'typed-emitter';
import { Coords, GameData, PathItem, PlayerData } from './Types';

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

/**
 * Player 0 must connect left to right
 * Player 1 must connect top to bottom
 */
export default class Game extends (EventEmitter as unknown as new () => TypedEmitter<GameEvents>)
{
    private hexes: (null|PlayerIndex)[][];
    private started = false;
    private currentPlayerIndex: PlayerIndex = 0;
    private winner: null|PlayerIndex = null;

    constructor(
        private players: [PlayerInterface, PlayerInterface],
        private size: number = 11,
    ) {
        super();

        this.hexes = Array(this.size)
            .fill([])
            .map(() => Array(this.size).fill(null))
        ;
    }

    static createFromGrid(players: [PlayerInterface, PlayerInterface], hexes: (null|PlayerIndex)[][]): Game
    {
        const game = new Game(players, hexes.length);

        hexes.forEach((line, row) => {
            line.forEach((value, col) => {
                game.hexes[row][col] = value;
            });
        });

        return game;
    }

    static createFromGameData(players: [PlayerInterface, PlayerInterface], gameData: GameData): Game
    {
        const game = new Game(players, gameData.size);

        gameData.hexes.forEach((line, row) => {
            line.split('').forEach((value, col) => {
                if ('0' === value) {
                    game.setCell(new Move(row, col), 0);
                } else if ('1' === value) {
                    game.setCell(new Move(row, col), 1);
                }
            });
        });

        // Do not handle gameData.started here. Let business logic handle the case.

        return game;
    }

    getSize(): number
    {
        return this.size;
    }

    getPlayers(): [PlayerInterface, PlayerInterface]
    {
        return this.players;
    }

    getPlayer(playerIndex: PlayerIndex): PlayerInterface
    {
        return this.players[playerIndex];
    }

    getCurrentPlayerIndex(): PlayerIndex
    {
        return this.currentPlayerIndex;
    }

    setCurrentPlayerIndex(currentPlayerIndex: PlayerIndex): void
    {
        this.currentPlayerIndex = currentPlayerIndex;
    }

    getCurrentPlayer(): PlayerInterface
    {
        return this.players[this.currentPlayerIndex];
    }

    hasWinner(): boolean
    {
        return null !== this.winner;
    }

    isEnded(): boolean
    {
        return null !== this.winner;
    }

    getStrictWinner(): PlayerIndex
    {
        if (null === this.winner) {
            throw new Error('Trying to strictly get the winner but game not finished');
        }

        return this.winner;
    }

    setWinner(playerIndex: PlayerIndex): void
    {
        if (null !== this.winner) {
            throw new Error('Cannot set a winner again, there is already a winner');
        }

        this.winner = playerIndex;

        this.emit('ended', playerIndex);
    }

    getCells(): (null|PlayerIndex)[][]
    {
        return this.hexes;
    }

    getCellsClone(): (null|PlayerIndex)[][]
    {
        return this.hexes.map(row => row.slice());
    }

    getCell(row: number, col: number): null|PlayerIndex
    {
        return this.hexes[row][col];
    }

    isEmpty(row: number, col: number): boolean
    {
        return null === this.hexes[row][col];
    }

    isCellCoordsValid(row: number, col: number): boolean
    {
        return row >= 0 && row < this.size && col >= 0 && col < this.size;
    }

    /**
     * Set a cell to a value.
     * Should be called after server update events.
     * Do not check the move nor change the game state.
     * Should call move() instead to play the game.
     */
    setCell(move: Move, value: null | PlayerIndex): void
    {
        this.hexes[move.getRow()][move.getCol()] = value;

        if (null === value) {
            return;
        }

        this.emit('played', move, value);

        if (this.hasPlayerConnection(this.currentPlayerIndex)) {
            this.setWinner(this.currentPlayerIndex);
            return;
        }
    }

    start(): void
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
    checkMove(move: Move): void
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
    move(move: Move): void
    {
        this.checkMove(move);

        this.setCell(move, this.currentPlayerIndex);

        this.changeCurrentPlayer();
    }

    /**
     * Makes current player abandon
     */
    abandon(): void
    {
        this.changeCurrentPlayer();
        this.setWinner(this.currentPlayerIndex);
    }

    otherPlayerIndex(): PlayerIndex
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

    private updateWinner(): void
    {
        this.winner = this.calculateWinner();
    }

    getSideCells(playerIndex: PlayerIndex, sideIndex: 0 | 1): Coords[]
    {
        const z = this.size - 1;

        return Array(this.size)
            .fill(0)
            .map((_, i) => playerIndex
                ? sideIndex
                    ? {row: z, col: i} // bottom
                    : {row: 0, col: i} // top
                : sideIndex
                    ? {row: i, col: z} // right
                    : {row: i, col: 0} // left
            )
        ;
    }

    calculateWinner(): null|PlayerIndex
    {
        if (this.hasPlayerConnection(0)) {
            return 0;
        }

        if (this.hasPlayerConnection(1)) {
            return 1;
        }

        return null;
    }

    hasPlayerConnection(playerIndex: PlayerIndex): boolean
    {
        const hash = (cell: Coords): string => cell.row + '_' + cell.col;

        const visited: {[key: string]: true} = {};
        const frontier: Coords[] = [];

        this.getSideCells(playerIndex, 0).forEach(cell => {
            if (playerIndex === this.hexes[cell.row][cell.col]) {
                frontier.push(cell);
                visited[hash(cell)] = true;
            }
        });

        let current: undefined|Coords;

        while ((current = frontier.shift())) {
            if (this.isCellOnSide(current, playerIndex, 1)) {
                return true;
            }

            this
                .getNeighboors(current, playerIndex)
                .forEach(cell => {
                    if (!visited[hash(cell)]) {
                        frontier.push(cell);
                        visited[hash(cell)] = true;
                    }
                })
            ;
        }

        return false;
    }

    private flattenPath(pathItem: PathItem): Coords[]
    {
        const path: Coords[] = [];
        let current: null | PathItem = pathItem;

        while (current) {
            path.unshift(current.cell);

            current = current.parent;
        }

        return path;
    }

    getShortestWinningPath(): null | Coords[]
    {
        this.updateWinner();

        const playerIndex = this.winner;

        if (null === playerIndex) {
            return null;
        }

        const visited: {[key: string]: true} = {};
        const hash = (cell: Coords): string => cell.row + '_' + cell.col;
        const pathHeads: PathItem[] = this
            .getSideCells(playerIndex, 0)
            .filter(cell => this.hexes[cell.row][cell.col] === playerIndex)
            .map<PathItem>(cell => {
                visited[hash(cell)] = true;

                return {
                    parent: null,
                    cell,
                }
            })
        ;

        let pathHead: undefined | PathItem;

        while ((pathHead = pathHeads.shift())) {
            if (this.isCellOnSide(pathHead.cell, playerIndex, 1)) {
                return this.flattenPath(pathHead);
            }

            this.getNeighboors(pathHead.cell, playerIndex)
                .forEach(cell => {
                    if (!visited[hash(cell)]) {
                        const pathItem: PathItem = {
                            parent: pathHead as PathItem,
                            cell,
                        };

                        pathHeads.push(pathItem);
                        visited[hash(cell)] = true;
                    }
                })
            ;
        }

        return null;
    }

    inBoard(cell: Coords): boolean
    {
        return cell.row >= 0 && cell.row < this.size
            && cell.col >= 0 && cell.col < this.size
        ;
    }

    isCellOnSide(cell: Coords, playerIndex: PlayerIndex, sideIndex: 0 | 1): boolean
    {
        const z = this.size - 1;

        return playerIndex
            ? sideIndex
                ? cell.row === z // bottom
                : cell.row === 0 // top
            : sideIndex
                ? cell.col === z // right
                : cell.col === 0 // left
    }

    getNeighboors(cell: Coords, playerIndex: undefined | null | PlayerIndex = undefined): Coords[]
    {
        return [
            {row: cell.row, col: cell.col - 1},
            {row: cell.row, col: cell.col + 1},

            {row: cell.row - 1, col: cell.col},
            {row: cell.row - 1, col: cell.col + 1},

            {row: cell.row + 1, col: cell.col},
            {row: cell.row + 1, col: cell.col - 1},
        ]
            .filter(cell => this.inBoard(cell)
                && (
                    playerIndex === undefined
                    || playerIndex === this.hexes[cell.row][cell.col]
                )
            )
        ;
    }

    toData(): GameData
    {
        return {
            players: this.players.map(player => player.toData()) as [PlayerData, PlayerData],
            size: this.size,
            started: this.started,
            hexes: this.hexes.map(
                row => row
                    .map(
                        cell => null === cell
                            ? '.' :
                            (cell
                                ? '1'
                                : '0'
                            ),
                    )
                    .join('')
                ,
            ),
        };
    }
}
