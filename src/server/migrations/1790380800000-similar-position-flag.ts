import { MigrationInterface, QueryRunner } from "typeorm";

export class SimilarPositionFlag1790380800000 implements MigrationInterface {
    name = 'SimilarPositionFlag1790380800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`similar_position_flag\` (\`id\` int NOT NULL AUTO_INCREMENT, \`context\` varchar(16) NOT NULL, \`ip\` varchar(45) NULL, \`flaggedGameStonesCount\` smallint NOT NULL, \`boardsize\` smallint NOT NULL, \`position\` json NOT NULL, \`similarity\` float NOT NULL, \`commonStones\` smallint NOT NULL, \`mirror\` varchar(16) NULL, \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`playerId\` int NULL, \`flaggedGameId\` int NOT NULL, \`botGameId\` int NULL, INDEX \`IDX_1474c4cf0e89a6f99dcb0f1db7\` (\`createdAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`similar_position_flag\` ADD CONSTRAINT \`FK_91f42fa6b799224cb3058eecfbd\` FOREIGN KEY (\`playerId\`) REFERENCES \`player\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`similar_position_flag\` ADD CONSTRAINT \`FK_31b63c1ecf408199d83e4ad5a3e\` FOREIGN KEY (\`flaggedGameId\`) REFERENCES \`game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`similar_position_flag\` ADD CONSTRAINT \`FK_9a95cc8cac2d393e4e627ea33a4\` FOREIGN KEY (\`botGameId\`) REFERENCES \`game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`similar_position_flag\` DROP FOREIGN KEY \`FK_9a95cc8cac2d393e4e627ea33a4\``);
        await queryRunner.query(`ALTER TABLE \`similar_position_flag\` DROP FOREIGN KEY \`FK_31b63c1ecf408199d83e4ad5a3e\``);
        await queryRunner.query(`ALTER TABLE \`similar_position_flag\` DROP FOREIGN KEY \`FK_91f42fa6b799224cb3058eecfbd\``);
        await queryRunner.query(`DROP INDEX \`IDX_1474c4cf0e89a6f99dcb0f1db7\` ON \`similar_position_flag\``);
        await queryRunner.query(`DROP TABLE \`similar_position_flag\``);
    }

}
