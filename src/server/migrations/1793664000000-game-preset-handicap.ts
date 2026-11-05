import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Handicap can be set when creating friendly and bot games.
 */
export class GamePresetHandicap1793664000000 implements MigrationInterface {
    name = 'GamePresetHandicap1793664000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game\` ADD \`presetHandicap\` float NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game\` DROP COLUMN \`presetHandicap\``);
    }
}
