import { MigrationInterface, QueryRunner } from "typeorm";

export class Puzzles1790899200000 implements MigrationInterface {
    name = 'Puzzles1790899200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`puzzle\` (\`id\` int NOT NULL AUTO_INCREMENT, \`publicId\` char(36) NOT NULL, \`title\` varchar(64) NULL, \`description\` longtext NULL, \`boardsize\` smallint NOT NULL, \`redStones\` text NOT NULL, \`blueStones\` text NOT NULL, \`lastMove\` varchar(4) NULL, \`playerColor\` smallint NOT NULL, \`tree\` json NOT NULL, \`published\` tinyint NOT NULL DEFAULT 0, \`publishedAt\` datetime NULL, \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`authorId\` int NULL, \`gameId\` int NULL, INDEX \`IDX_84f813d6ec1405018f05887438\` (\`published\`, \`publishedAt\`), UNIQUE INDEX \`IDX_3ca500ef958fe178746bfd71d2\` (\`publicId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`puzzle\` ADD CONSTRAINT \`FK_e9f68cb3becc62457671bd8432d\` FOREIGN KEY (\`authorId\`) REFERENCES \`player\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`puzzle\` ADD CONSTRAINT \`FK_dbe197e1d7d719f12975fb40c06\` FOREIGN KEY (\`gameId\`) REFERENCES \`game\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`puzzle\` DROP FOREIGN KEY \`FK_dbe197e1d7d719f12975fb40c06\``);
        await queryRunner.query(`ALTER TABLE \`puzzle\` DROP FOREIGN KEY \`FK_e9f68cb3becc62457671bd8432d\``);
        await queryRunner.query(`DROP INDEX \`IDX_3ca500ef958fe178746bfd71d2\` ON \`puzzle\``);
        await queryRunner.query(`DROP INDEX \`IDX_84f813d6ec1405018f05887438\` ON \`puzzle\``);
        await queryRunner.query(`DROP TABLE \`puzzle\``);
    }

}
