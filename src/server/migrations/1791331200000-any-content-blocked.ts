import { MigrationInterface, QueryRunner } from "typeorm";

export class AnyContentBlocked1791331200000 implements MigrationInterface {
    name = 'AnyContentBlocked1791331200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`player_moderation_action\` CHANGE \`avatarBlockedUntil\` \`anyContentBlockedUntil\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`puzzle\` ADD \`updatedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`UPDATE \`puzzle\` SET \`updatedAt\` = \`createdAt\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`puzzle\` DROP COLUMN \`updatedAt\``);
        await queryRunner.query(`ALTER TABLE \`player_moderation_action\` CHANGE \`anyContentBlockedUntil\` \`avatarBlockedUntil\` datetime NULL`);
    }

}
