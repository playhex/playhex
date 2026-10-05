import { MigrationInterface, QueryRunner } from "typeorm";

export class VideoPublishedAt1791417600000 implements MigrationInterface {
    name = 'VideoPublishedAt1791417600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`video\` DROP COLUMN \`languages\``);
        await queryRunner.query(`ALTER TABLE \`video\` ADD \`publishedAt\` datetime NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`video\` DROP COLUMN \`publishedAt\``);
        await queryRunner.query(`ALTER TABLE \`video\` ADD \`languages\` text NOT NULL`);
    }

}
