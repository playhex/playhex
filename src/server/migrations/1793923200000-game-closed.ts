import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Closed games are not listed while waiting for an opponent:
 * only people having the link can join.
 */
export class GameClosed1793923200000 implements MigrationInterface {
    name = 'GameClosed1793923200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game\` ADD \`closed\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game\` DROP COLUMN \`closed\``);
    }
}
