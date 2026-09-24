import { MigrationInterface, QueryRunner } from "typeorm";

export class ChannelSlowMode1790236800000 implements MigrationInterface {
    name = 'ChannelSlowMode1790236800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`channel\` ADD \`slowMode\` smallint NULL DEFAULT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`channel\` DROP COLUMN \`slowMode\``);
    }

}
