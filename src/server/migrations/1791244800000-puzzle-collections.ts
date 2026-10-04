import { MigrationInterface, QueryRunner } from "typeorm";

export class PuzzleCollections1791244800000 implements MigrationInterface {
    name = 'PuzzleCollections1791244800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`puzzle_collection\` (\`id\` int NOT NULL AUTO_INCREMENT, \`publicId\` char(36) NOT NULL, \`name\` varchar(64) NOT NULL, \`description\` text NULL, \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updatedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`authorId\` int NULL, UNIQUE INDEX \`IDX_6e105f26ac704772623d4b0d06\` (\`publicId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`puzzle\` ADD \`collectionPosition\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`puzzle\` ADD \`collectionId\` int NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_52a13b8d3abc5db0128ed4d617\` ON \`puzzle\` (\`collectionId\`, \`collectionPosition\`)`);
        await queryRunner.query(`ALTER TABLE \`puzzle_collection\` ADD CONSTRAINT \`FK_737b9fba91b72e9900f08c88216\` FOREIGN KEY (\`authorId\`) REFERENCES \`player\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`puzzle\` ADD CONSTRAINT \`FK_6e5faeed723eaee3e294f002ae7\` FOREIGN KEY (\`collectionId\`) REFERENCES \`puzzle_collection\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`puzzle\` DROP FOREIGN KEY \`FK_6e5faeed723eaee3e294f002ae7\``);
        await queryRunner.query(`ALTER TABLE \`puzzle_collection\` DROP FOREIGN KEY \`FK_737b9fba91b72e9900f08c88216\``);
        await queryRunner.query(`DROP INDEX \`IDX_52a13b8d3abc5db0128ed4d617\` ON \`puzzle\``);
        await queryRunner.query(`ALTER TABLE \`puzzle\` DROP COLUMN \`collectionId\``);
        await queryRunner.query(`ALTER TABLE \`puzzle\` DROP COLUMN \`collectionPosition\``);
        await queryRunner.query(`DROP INDEX \`IDX_6e105f26ac704772623d4b0d06\` ON \`puzzle_collection\``);
        await queryRunner.query(`DROP TABLE \`puzzle_collection\``);
    }

}
