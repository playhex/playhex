import { MigrationInterface, QueryRunner } from "typeorm";

export class HexplorerStudy1793836800000 implements MigrationInterface {
    name = 'HexplorerStudy1793836800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`hexplorer_study\` (\`id\` int NOT NULL AUTO_INCREMENT, \`publicId\` char(36) NOT NULL, \`title\` varchar(64) NULL, \`data\` json NOT NULL, \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updatedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`authorId\` int NULL, \`forkedFromId\` int NULL, UNIQUE INDEX \`IDX_890fe3754ecd94559871fc7228\` (\`publicId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`hexplorer_study\` ADD CONSTRAINT \`FK_c545e4f3d33cff913f8a99f73d1\` FOREIGN KEY (\`authorId\`) REFERENCES \`player\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`hexplorer_study\` ADD CONSTRAINT \`FK_e30368ef01a907a9538805a7447\` FOREIGN KEY (\`forkedFromId\`) REFERENCES \`hexplorer_study\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`hexplorer_study\` DROP FOREIGN KEY \`FK_e30368ef01a907a9538805a7447\``);
        await queryRunner.query(`ALTER TABLE \`hexplorer_study\` DROP FOREIGN KEY \`FK_c545e4f3d33cff913f8a99f73d1\``);
        await queryRunner.query(`DROP INDEX \`IDX_890fe3754ecd94559871fc7228\` ON \`hexplorer_study\``);
        await queryRunner.query(`DROP TABLE \`hexplorer_study\``);
    }

}
