import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Tournament series: a suite of recurring tournaments.
 * Tournaments can now belong to a series (nullable).
 */
export class TournamentSeries1789400445726 implements MigrationInterface {
    name = 'TournamentSeries1789400445726'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`tournament_series_admin\` (\`tournamentSeriesId\` int NOT NULL, \`playerId\` int NOT NULL, PRIMARY KEY (\`tournamentSeriesId\`, \`playerId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`tournament_series\` (\`id\` int NOT NULL AUTO_INCREMENT, \`publicId\` char(36) NOT NULL, \`title\` varchar(64) NOT NULL, \`slug\` varchar(64) NOT NULL, \`description\` longtext NULL, \`titlePattern\` varchar(64) NULL, \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`featuredFromInSeconds\` int NULL, \`hostId\` int NOT NULL, UNIQUE INDEX \`IDX_83b708cfb30c4250597911ef0d\` (\`publicId\`), UNIQUE INDEX \`IDX_c61100cd4417ef73263092551f\` (\`slug\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`tournament\` ADD \`seriesId\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`tournament_series_admin\` ADD CONSTRAINT \`FK_cd84703d832ad732ae1944b9c0f\` FOREIGN KEY (\`tournamentSeriesId\`) REFERENCES \`tournament_series\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`tournament_series_admin\` ADD CONSTRAINT \`FK_fffe50b1d58f4dce3e999a38f2d\` FOREIGN KEY (\`playerId\`) REFERENCES \`player\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`tournament_series\` ADD CONSTRAINT \`FK_07fd4e14b900fa60235712a8efd\` FOREIGN KEY (\`hostId\`) REFERENCES \`player\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`tournament\` ADD CONSTRAINT \`FK_73762e0e788ca89665f325e42c2\` FOREIGN KEY (\`seriesId\`) REFERENCES \`tournament_series\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournament\` DROP FOREIGN KEY \`FK_73762e0e788ca89665f325e42c2\``);
        await queryRunner.query(`ALTER TABLE \`tournament_series\` DROP FOREIGN KEY \`FK_07fd4e14b900fa60235712a8efd\``);
        await queryRunner.query(`ALTER TABLE \`tournament_series_admin\` DROP FOREIGN KEY \`FK_fffe50b1d58f4dce3e999a38f2d\``);
        await queryRunner.query(`ALTER TABLE \`tournament_series_admin\` DROP FOREIGN KEY \`FK_cd84703d832ad732ae1944b9c0f\``);
        await queryRunner.query(`ALTER TABLE \`tournament\` DROP COLUMN \`seriesId\``);
        await queryRunner.query(`DROP INDEX \`IDX_c61100cd4417ef73263092551f\` ON \`tournament_series\``);
        await queryRunner.query(`DROP INDEX \`IDX_83b708cfb30c4250597911ef0d\` ON \`tournament_series\``);
        await queryRunner.query(`DROP TABLE \`tournament_series\``);
        await queryRunner.query(`DROP TABLE \`tournament_series_admin\``);
    }
}
