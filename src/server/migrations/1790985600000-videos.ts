import { MigrationInterface, QueryRunner } from "typeorm";

export class Videos1790985600000 implements MigrationInterface {
    name = 'Videos1790985600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`video\` (\`id\` int NOT NULL AUTO_INCREMENT, \`publicId\` char(36) NOT NULL, \`url\` varchar(512) NOT NULL, \`title\` varchar(255) NOT NULL, \`authorName\` varchar(128) NOT NULL, \`durationSeconds\` int UNSIGNED NOT NULL, \`languages\` text NOT NULL, \`keywords\` varchar(512) NULL, \`thumbnailPath\` varchar(255) NOT NULL, \`accepted\` tinyint NULL, \`moderatedAt\` datetime NULL, \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`submittedById\` int NULL, INDEX \`IDX_ba5cb9f4cbf23ea3dcb6c4546b\` (\`accepted\`, \`createdAt\`), UNIQUE INDEX \`IDX_10cc48168a7b2566b1dc40c3a1\` (\`publicId\`), UNIQUE INDEX \`IDX_9c4f2325dcc478a7691292bb8d\` (\`url\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`video\` ADD CONSTRAINT \`FK_e0674aff7b7e83e317d9725352b\` FOREIGN KEY (\`submittedById\`) REFERENCES \`player\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`video\` DROP FOREIGN KEY \`FK_e0674aff7b7e83e317d9725352b\``);
        await queryRunner.query(`DROP INDEX \`IDX_9c4f2325dcc478a7691292bb8d\` ON \`video\``);
        await queryRunner.query(`DROP INDEX \`IDX_10cc48168a7b2566b1dc40c3a1\` ON \`video\``);
        await queryRunner.query(`DROP INDEX \`IDX_ba5cb9f4cbf23ea3dcb6c4546b\` ON \`video\``);
        await queryRunner.query(`DROP TABLE \`video\``);
    }

}
