import { MigrationInterface, QueryRunner } from "typeorm";

export class PlayerSettingsTutorialCompletedSteps1791849600000 implements MigrationInterface {
    name = 'PlayerSettingsTutorialCompletedSteps1791849600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`player_settings\` ADD \`tutorialCompletedSteps\` json NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`player_settings\` DROP COLUMN \`tutorialCompletedSteps\``);
    }

}
