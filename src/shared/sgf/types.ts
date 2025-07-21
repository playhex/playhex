type SGFNode = {

    /**
     * Comment.
     *
     * https://www.red-bean.com/sgf/properties.html#C
     */
    C?: string;

    /**
     * Node name.
     *
     * https://www.red-bean.com/sgf/properties.html#N
     */
    N?: string;
};

export type SGF = SGFNode & {

    /**
     * Version of SGF used.
     *
     * https://www.red-bean.com/sgf/properties.html#FF
     */
    FF?: number;

    /**
     * Charset used in this SGF file.
     *
     * https://www.red-bean.com/sgf/properties.html#CA
     */
    CA?: string;

    /**
     * Name and version number of the application used to create this.
     *
     * I.e: "PlayHex:1.0.0"
     *
     * https://www.red-bean.com/sgf/properties.html#AP
     */
    AP?: `${string}:${string}`;

    /**
     * Source of the game.
     *
     * https://www.red-bean.com/sgf/properties.html#SO
     */
    SO?: string;

    /**
     * Place where the game were played.
     *
     * https://www.red-bean.com/sgf/properties.html#PC
     */
    PC?: string;

    /**
     * Place where the game were played.
     *
     * https://www.red-bean.com/sgf/properties.html#GN
     */
    GN?: string;

    /**
     * Game.
     *
     * I.e: Go = 1, Hex = 11, ...
     *
     * https://www.red-bean.com/sgf/properties.html#GM
     */
    GM?: number;

    /**
     * Size of the board.
     *
     * I.e: 19, "19:13", ...
     *
     * https://www.red-bean.com/sgf/properties.html#SZ
     */
    SZ?: number | `${number}:${number}`;

    /**
     * Rules used for this game.
     *
     * https://www.red-bean.com/sgf/properties.html#RU
     */
    RU?: string;

    /**
     * Black player name.
     *
     * https://www.red-bean.com/sgf/properties.html#PB
     */
    PB?: string;

    /**
     * White player name.
     *
     * https://www.red-bean.com/sgf/properties.html#PW
     */
    PW?: string;

    /**
     * Black rating.
     *
     * I.e for Go: `12k` or `12kyu`, `3d` or `3dan`, `1683`, `1500?` for uncertain rating.
     *
     * https://www.red-bean.com/sgf/properties.html#BR
     */
    BR?: string;

    /**
     * White rating.
     * See `BR` for more documentation and examples.
     *
     * https://www.red-bean.com/sgf/properties.html#WR
     */
    WR?: string;

    /**
     * Date when this game has been played.
     *
     * https://www.red-bean.com/sgf/properties.html#DT
     */
    DT?: string;

    /**
     * Handicap.
     *
     * https://www.red-bean.com/sgf/go.html#HA
     */
    HA?: number | string;

    /**
     * Result (outcome) of the game.
     *
     * Some examples from SGF documentation:
     *  `B`, `B+Resign` or `B+R`, `W+Time` or `W+T`, `B+12.5` score, `Void` no result or suspended, `?` unknown, `0` draw
     *
     * https://www.red-bean.com/sgf/properties.html#RE
     */
    RE?: string;

    /**
     * Whose turn it is to play.
     *
     * https://www.red-bean.com/sgf/properties.html#PL
     */
    PL?: SGFTypeColor;

    /**
     * If this game is from an event, like a tournament, meet, ..., name of this event.
     *
     * https://www.red-bean.com/sgf/properties.html#EV
     */
    EV?: string;

    /**
     * Round number, and type of round. Example:
     * `5 (final)` for round 5, and this is the final.
     *
     * https://www.red-bean.com/sgf/properties.html#RO
     */
    RO?: string;

    /**
     * Game comments.
     * Provide some background information and/or to summarize the game itself.
     *
     * https://www.red-bean.com/sgf/properties.html#GC
     */
    GC?: string;

    /**
     * List of moves nodes of the main line.
     */
    moves?: SGFMove[];
};

export type SGFMove = SGFNode & {

    /**
     * Black move.
     *
     * https://www.red-bean.com/sgf/properties.html#B
     */
    B?: string;

    /**
     * White move.
     *
     * https://www.red-bean.com/sgf/properties.html#W
     */
    W?: string;

    /**
     * List of variations.
     */
    variations?: SGFMove[][];
};

export type SGFProperty = keyof SGF | keyof SGFMove;

export type SGFTypeColor = 'B' | 'W';
