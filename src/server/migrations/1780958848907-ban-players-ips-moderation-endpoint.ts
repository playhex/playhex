import { MigrationInterface, QueryRunner } from "typeorm";

export class BanPlayersIpsModerationEndpoint1780958848907 implements MigrationInterface {
    name = 'BanPlayersIpsModerationEndpoint1780958848907'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`player_moderation_action\` ADD \`ipBannedUntil\` datetime NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`player_moderation_action\` DROP COLUMN \`ipBannedUntil\``);
    }

}
