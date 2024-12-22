// TODO check

/**
 * After updating Player (i.e after setting him a new currentRating),
 * password was undefined but set to null by typeorm while persisting.
 * Which causes the next persist set player password to null...
 *
 * See https://github.com/typeorm/typeorm/issues/4167
 *
 * This subscriber fixes this behaviour.
 */
