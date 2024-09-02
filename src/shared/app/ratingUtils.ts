import { Glicko2, Glicko2Settings } from 'glicko2';
import { HostedGame, Player, Rating } from './models';
import { TimeControlCadencyName, timeControlToCadencyName } from './timeControlUtils';

export const RANKED_BOARDSIZE_MIN = 11;
export const RANKED_BOARDSIZE_MAX = 19;

export type BoardsizeCategory = 'small' | 'medium' | 'large';

export type RatingCategory = 'overall'
    | BoardsizeCategory
    | TimeControlCadencyName
    | `${BoardsizeCategory}.${TimeControlCadencyName}`
;

/**
 * Default glicko2 rating attribued to new players
 */
export const glicko2Settings: Required<Pick<Glicko2Settings, 'rating' | 'rd' | 'vol'>> = {
    rating: 1500,
    rd: 350,
    vol: 0.06,
};

/**
 * Creates a ranking to update player ratings after a match
 */
export const createRanking = () => new Glicko2(glicko2Settings);

/**
 * Creates an instance of Rating for a player not yet rated in a given category
 */
export const createInitialRating = (player: Player, category: RatingCategory = 'overall'): Rating => {
    const rating = new Rating();

    rating.player = player;
    rating.category = category;
    rating.createdAt = player.createdAt;
    rating.rating = glicko2Settings.rating;
    rating.deviation = glicko2Settings.rd;
    rating.volatility = glicko2Settings.vol;

    return rating;
};

/**
 * All existing categories
 */
export const ratingCategories: RatingCategory[] = [
    'overall',
    'blitz',
    'normal',
    'correspondence',
    'small',
    'small.blitz',
    'small.normal',
    'small.correspondence',
    'medium',
    'medium.blitz',
    'medium.normal',
    'medium.correspondence',
    'large',
    'large.blitz',
    'large.normal',
    'large.correspondence',
];

export const validateRatingCategory = (category: unknown): category is RatingCategory => {
    return 'string' === typeof category && ratingCategories.includes(category as RatingCategory);
};

/**
 * Get rating category for a given board size
 */
export const getBoardsizeCategory = (boardsize: number): BoardsizeCategory => {
    if (boardsize <= 12) {
        return 'small';
    }

    if (boardsize >= 16) {
        return 'large';
    }

    return 'medium';
};

/**
 * Returns rating categories and sub-categories for a given game.
 * I.e ["overall", "small", "blitz", "small.blitz"]
 */
export const getRatingCategoriesFromGame = (hostedGame: HostedGame): RatingCategory[] => {
    const cadency = timeControlToCadencyName(hostedGame.gameOptions);
    const boardsize = getBoardsizeCategory(hostedGame.gameOptions.boardsize);

    return [
        'overall',
        boardsize,
        cadency,
        `${boardsize}.${cadency}`,
    ];
};

/**
 * Whether a rating can be considered as "confident",
 * i.e glicko2 rating deviation is small enough.
 *
 * If not confident, rating should be displayed like "~1500".
 */
export const isRatingConfident = (rating: Rating): boolean => rating.deviation < 100;
