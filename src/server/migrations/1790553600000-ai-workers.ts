import { MigrationInterface, QueryRunner } from "typeorm";

export class AiWorkers1790553600000 implements MigrationInterface {
    name = 'AiWorkers1790553600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`player_ai_worker_key\` (\`id\` int NOT NULL AUTO_INCREMENT, \`playerId\` int NOT NULL, \`name\` varchar(64) NOT NULL, \`key\` char(32) NOT NULL, \`enabled\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(3) NOT NULL DEFAULT current_timestamp(3), \`revokedAt\` datetime(3) NULL, \`lastSeenAt\` datetime(3) NULL, UNIQUE INDEX \`IDX_e4519fce2f137fb18875594719\` (\`key\`), UNIQUE INDEX \`IDX_6882198fa343ffa729f833cf3d\` (\`playerId\`, \`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`player_ai_worker_key\` ADD CONSTRAINT \`FK_00306a8519cfd3f18181b32e8e1\` FOREIGN KEY (\`playerId\`) REFERENCES \`player\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`ai_config\` DROP COLUMN \`isRemote\``);
        await queryRunner.query(`ALTER TABLE \`ai_config\` DROP COLUMN \`requireMorePower\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`ai_config\` ADD \`requireMorePower\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`ai_config\` ADD \`isRemote\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`player_ai_worker_key\` DROP FOREIGN KEY \`FK_00306a8519cfd3f18181b32e8e1\``);
        await queryRunner.query(`DROP TABLE \`player_ai_worker_key\``);
    }

}
