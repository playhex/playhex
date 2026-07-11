import { Entity, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import HostedGame from './HostedGame.js';

/**
 * MinHash/LSH band hash of the final position of a game.
 * Used to quickly find games with a similar position (up to mirroring),
 * without comparing to every other game.
 *
 * A game position is reduced to a fixed number of band hashes
 * (see shared/canonical-position/minhash.ts):
 * two similar positions get a same bandHash for at least one bandNo
 * with high probability, so similar games candidates are found
 * with simple index lookups on (bandNo, bandHash).
 *
 * Band hashes of the 3 mirror variants of the position are also stored,
 * so games similar to a mirror of the searched position are found too.
 */
@Entity()
export default class GamePositionBand
{
    /**
     * Which band this hash belongs to, 0 to BAND_COUNT - 1.
     */
    @PrimaryColumn({ type: 'tinyint' })
    bandNo: number;

    /**
     * Hash of the band MinHash values, 32-bit unsigned.
     */
    @PrimaryColumn({ type: 'int', unsigned: true })
    bandHash: number;

    @PrimaryColumn()
    hostedGameId: number;

    @ManyToOne(() => HostedGame)
    @JoinColumn({ name: 'hostedGameId' })
    hostedGame: Relation<HostedGame>;
}
