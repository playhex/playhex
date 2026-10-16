import { MigrationInterface, QueryRunner } from "typeorm";

export class Training1792281600000 implements MigrationInterface {
    name = 'Training1792281600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`training_attempt\` (\`id\` int NOT NULL AUTO_INCREMENT, \`trainingType\` varchar(32) NOT NULL, \`playerId\` int NOT NULL, \`puzzleId\` int NOT NULL, \`lines\` json NOT NULL, \`hintUsed\` tinyint NOT NULL DEFAULT 0, \`gaveUp\` tinyint NOT NULL DEFAULT 0, \`inSession\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX \`IDX_50e6e44cbc52fb46e35ade9514\` (\`playerId\`, \`trainingType\`, \`createdAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`training_progress\` (\`id\` int NOT NULL AUTO_INCREMENT, \`trainingType\` varchar(32) NOT NULL, \`playerId\` int NOT NULL, \`puzzleId\` int NOT NULL, \`box\` smallint NOT NULL, \`lapses\` smallint NOT NULL, \`attemptsCount\` int NOT NULL, \`lastAttemptAt\` datetime NOT NULL, \`nextReviewAt\` datetime NOT NULL, UNIQUE INDEX \`IDX_9415df1b65cd10ecda8f2dd156\` (\`playerId\`, \`trainingType\`, \`puzzleId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`training_attempt\` ADD CONSTRAINT \`FK_ad8fedef2cd823e482c44cb335b\` FOREIGN KEY (\`playerId\`) REFERENCES \`player\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`training_attempt\` ADD CONSTRAINT \`FK_da39ded85db3ed659ac734cdbd0\` FOREIGN KEY (\`puzzleId\`) REFERENCES \`puzzle\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`training_progress\` ADD CONSTRAINT \`FK_3857fe8809dd62b212ab879112f\` FOREIGN KEY (\`playerId\`) REFERENCES \`player\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`training_progress\` ADD CONSTRAINT \`FK_936483bece0a223820f0e72fa64\` FOREIGN KEY (\`puzzleId\`) REFERENCES \`puzzle\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`training_progress\` DROP FOREIGN KEY \`FK_936483bece0a223820f0e72fa64\``);
        await queryRunner.query(`ALTER TABLE \`training_progress\` DROP FOREIGN KEY \`FK_3857fe8809dd62b212ab879112f\``);
        await queryRunner.query(`ALTER TABLE \`training_attempt\` DROP FOREIGN KEY \`FK_da39ded85db3ed659ac734cdbd0\``);
        await queryRunner.query(`ALTER TABLE \`training_attempt\` DROP FOREIGN KEY \`FK_ad8fedef2cd823e482c44cb335b\``);
        await queryRunner.query(`DROP INDEX \`IDX_9415df1b65cd10ecda8f2dd156\` ON \`training_progress\``);
        await queryRunner.query(`DROP TABLE \`training_progress\``);
        await queryRunner.query(`DROP INDEX \`IDX_50e6e44cbc52fb46e35ade9514\` ON \`training_attempt\``);
        await queryRunner.query(`DROP TABLE \`training_attempt\``);
    }

}
