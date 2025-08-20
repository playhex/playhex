import parse from 'parse-duration';

const parseStrict = (str: string): number => {
    const ms = parse(str);

    if (!ms) {
        throw new Error(`Invalid parse duration format: "${str}"`);
    }

    return ms;
};

/**
 * Here is all timings depending on bot/1v1, live/correspondence, and active game state:
 *  - created
 *  - started but empty, so chrono no started
 *  - started and one move, so chrono started and will end game if stale
 *
 * We detect staleness by 2 ways:
 *  - from game state, by reading game state, createdAt, startedAt, lastMoveAt, ... : works by only reading from database
 *  - when player goes offline, and listen to playerDisconnected event: allow better granularity, but needs to listen for that event first, so may break when server restart
 *
 * Here are different timings:
 *
 * 1v1              live                    correspondence
 * created          30s host offline        x
 * started - empty  1 day inactive          2 weeks inactive
 * started - move   x                       x
 *
 * 1vAI             any
 * started - empty  30 min inactive
 * started - move   x
 *
 * notes:
 * x: do nothing / let chrono end game
 * 1vAI should disallow correspondence time controls: bots play in real time. Maybe allow only live, or no time controls
 * 1vAI does not stay in created state: bots join instantly
 */
export const timings = {

    /**
     * A player starts a bot game, he plays first, but does not play a move.
     * Chrono does not start so game cannot cancel.
     */
    emptyBotGame: parseStrict('30 minutes'),

    /**
     * Correpondence game started, but first player does not play.
     */
    empty1v1Correspondence: parseStrict('1 week'),

    /**
     * Created live games should auto cancel when host leaves,
     * but in case this does not work (server restart between),
     * cancels it anyway one day later.
     */
    empty1v1Live: parseStrict('1 day'),

    /**
     * A player creates a live game, then goes offline.
     * Prevent keeping offline live game on lobby.
     * Requires listening players online/offline events.
     */
    createdOrEmptyLiveGameHostLeft: parseStrict('30 seconds'),

};
