import type { GameState } from './Types.js';

export const chatMessageVisibilities = ['public', 'private', 'malkovich'] as const;

/**
 * public: visible by everyone.
 * private: visible only by author.
 * malkovich: visible only by author until game is over (ended or canceled), then visible by everyone.
 */
export type ChatMessageVisibility = typeof chatMessageVisibilities[number];

/**
 * Whether a game chat message can be sent to anyone,
 * or only to its author.
 */
export const isChatMessageVisibleToEveryone = (
    chatMessage: { visibility?: ChatMessageVisibility },
    game: { state: GameState },
): boolean => {
    const visibility = chatMessage.visibility ?? 'public';

    if (visibility === 'public') {
        return true;
    }

    if (visibility === 'malkovich') {
        return game.state === 'ended' || game.state === 'canceled';
    }

    return false;
};
