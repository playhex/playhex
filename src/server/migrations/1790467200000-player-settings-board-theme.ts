import { MigrationInterface, QueryRunner } from "typeorm";

export class PlayerSettingsBoardTheme1790467200000 implements MigrationInterface {
    name = 'PlayerSettingsBoardTheme1790467200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`player_settings\` ADD \`boardTheme\` varchar(64) NULL DEFAULT NULL, ADD \`customBoardTheme\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`player_settings\` DROP COLUMN \`customBoardTheme\`, DROP COLUMN \`boardTheme\``);
    }

}
