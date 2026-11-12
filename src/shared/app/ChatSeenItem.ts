export type ChatSeenItem = {
    /**
     * createdAt of the last message seen by player,
     * or null if player never marked this chat as seen.
     */
    seenAt: null | Date;
};
