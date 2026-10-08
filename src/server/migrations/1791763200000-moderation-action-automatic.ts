import { MigrationInterface, QueryRunner } from "typeorm";

export class ModerationActionAutomatic1791763200000 implements MigrationInterface {
    name = 'ModerationActionAutomatic1791763200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`player_moderation_action\` ADD \`automatic\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`player_moderation_action\` DROP COLUMN \`automatic\``);
    }

}
