import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Tournament series can now create their next instances automatically,
 * from a recurrence schedule, by cloning the last instance.
 */
export class TournamentSeriesAutoCreate1789574400000 implements MigrationInterface {
    name = 'TournamentSeriesAutoCreate1789574400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournament_series\` ADD \`autoCreate\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`tournament_series\` ADD \`autoCreateSchedule\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`tournament_series\` ADD \`autoCreateOffsetSeconds\` int NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournament_series\` DROP COLUMN \`autoCreateOffsetSeconds\``);
        await queryRunner.query(`ALTER TABLE \`tournament_series\` DROP COLUMN \`autoCreateSchedule\``);
        await queryRunner.query(`ALTER TABLE \`tournament_series\` DROP COLUMN \`autoCreate\``);
    }
}
