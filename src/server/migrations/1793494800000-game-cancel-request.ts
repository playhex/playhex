import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Players can propose to cancel a game, and opponent can accept.
 */
export class GameCancelRequest1793494800000 implements MigrationInterface {
    name = 'GameCancelRequest1793494800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game\` ADD \`cancelRequest\` smallint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game\` DROP COLUMN \`cancelRequest\``);
    }

}
