import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlayerPronouns1794009600000 implements MigrationInterface {
    name = 'PlayerPronouns1794009600000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `player` ADD `pronouns` varchar(9) NULL DEFAULT NULL');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `player` DROP COLUMN `pronouns`');
    }
}
