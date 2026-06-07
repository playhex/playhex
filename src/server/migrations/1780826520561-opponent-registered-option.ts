import { MigrationInterface, QueryRunner } from "typeorm";

export class OpponentRegisteredOption1780826520561 implements MigrationInterface {
    name = 'OpponentRegisteredOption1780826520561'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`hosted_game\` ADD \`opponentMustBeRegistered\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`hosted_game\` DROP COLUMN \`opponentMustBeRegistered\``);
    }

}
