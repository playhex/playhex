import { MigrationInterface, QueryRunner } from 'typeorm';

export class ShortLink1795046400000 implements MigrationInterface {
    name = 'ShortLink1795046400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE TABLE `short_link` (`slug` varchar(32) NOT NULL, `target` varchar(512) NOT NULL, `clicks` int UNSIGNED NOT NULL DEFAULT \'0\', `lastUsedAt` datetime NULL, `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`slug`)) ENGINE=InnoDB');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE `short_link`');
    }
}
