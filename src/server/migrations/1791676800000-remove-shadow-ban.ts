import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Remove shadow ban feature, replaced by moderation.
 * Previously shadow deleted messages are marked as deleted by moderation
 * so they are not displayed publicly again.
 */
export class RemoveShadowBan1791676800000 implements MigrationInterface {
    name = 'RemoveShadowBan1791676800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE \`chat_message\` SET \`deletedByModeration\` = 1 WHERE \`shadowDeleted\` = 1`);
        await queryRunner.query(`UPDATE \`channel_chat_message\` SET \`deletedByModeration\` = 1 WHERE \`shadowDeleted\` = 1`);

        await queryRunner.query(`ALTER TABLE \`player\` DROP COLUMN \`shadowBanned\``);
        await queryRunner.query(`ALTER TABLE \`chat_message\` DROP COLUMN \`shadowDeleted\``);
        await queryRunner.query(`ALTER TABLE \`channel_chat_message\` DROP COLUMN \`shadowDeleted\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`channel_chat_message\` ADD \`shadowDeleted\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`chat_message\` ADD \`shadowDeleted\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`player\` ADD \`shadowBanned\` tinyint NOT NULL DEFAULT 0`);
    }

}
