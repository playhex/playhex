import { MigrationInterface, QueryRunner } from "typeorm";

export class ExternalGames1791504000000 implements MigrationInterface {
    name = 'ExternalGames1791504000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`external_game\` (\`id\` int NOT NULL AUTO_INCREMENT, \`publicId\` char(36) NOT NULL, \`externalId\` varchar(64) NOT NULL, \`boardsize\` smallint NOT NULL, \`moves\` text NOT NULL, \`moveTimestamps\` longtext NULL, \`player0Name\` varchar(64) NOT NULL, \`player1Name\` varchar(64) NOT NULL, \`player0ExternalId\` varchar(64) NULL, \`player1ExternalId\` varchar(64) NULL, \`player0Rating\` varchar(32) NULL, \`player1Rating\` varchar(32) NULL, \`winner\` smallint NULL, \`outcome\` varchar(15) NULL, \`startedAt\` datetime(3) NULL, \`endedAt\` datetime(3) NULL, \`source\` varchar(64) NULL, \`sourceUrl\` varchar(255) NULL, \`event\` varchar(128) NULL, \`createdAt\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updatedAt\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`createdById\` int NULL, INDEX \`IDX_ac5f6919005be827bf54f9898a\` (\`player1ExternalId\`, \`createdAt\`), INDEX \`IDX_48c9f777b17923bdf28181383c\` (\`player0ExternalId\`, \`createdAt\`), INDEX \`IDX_8c5c5dae13f96b7128dec29bd4\` (\`createdAt\`), UNIQUE INDEX \`IDX_70d45636f02eadaaefe01101b8\` (\`publicId\`), UNIQUE INDEX \`IDX_826b210afbacfaef505e4bc9b2\` (\`externalId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`external_game_analyze\` (\`externalGameId\` int NOT NULL, \`analyze\` json NULL, \`startedAt\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`endedAt\` datetime(3) NULL, PRIMARY KEY (\`externalGameId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`external_game_import_job\` (\`id\` int NOT NULL AUTO_INCREMENT, \`publicId\` char(36) NOT NULL, \`source\` varchar(15) NOT NULL, \`externalPlayerId\` varchar(64) NOT NULL, \`status\` varchar(15) NOT NULL, \`totalGames\` int NULL, \`importedGames\` int NOT NULL DEFAULT '0', \`skippedGames\` int NOT NULL DEFAULT '0', \`failedGames\` int NOT NULL DEFAULT '0', \`notFinishedGames\` int NOT NULL DEFAULT '0', \`lastError\` varchar(255) NULL, \`createdAt\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`startedAt\` datetime(3) NULL, \`endedAt\` datetime(3) NULL, \`requestedById\` int NOT NULL, INDEX \`IDX_2142f163b2b2e1008a5ebdd342\` (\`status\`, \`createdAt\`), UNIQUE INDEX \`IDX_e4a82695afbd6578743af2f190\` (\`publicId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`player\` ADD \`littleGolemPlid\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`player\` ADD \`littleGolemPseudo\` varchar(64) NULL`);
        await queryRunner.query(`ALTER TABLE \`external_game\` ADD CONSTRAINT \`FK_4d4db4333b41b530a46b24b3712\` FOREIGN KEY (\`createdById\`) REFERENCES \`player\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`external_game_analyze\` ADD CONSTRAINT \`FK_4827f87d23748a34ca4520196d1\` FOREIGN KEY (\`externalGameId\`) REFERENCES \`external_game\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`external_game_import_job\` ADD CONSTRAINT \`FK_4f997cc48a6f116f4b3e46d0a52\` FOREIGN KEY (\`requestedById\`) REFERENCES \`player\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`external_game_import_job\` DROP FOREIGN KEY \`FK_4f997cc48a6f116f4b3e46d0a52\``);
        await queryRunner.query(`ALTER TABLE \`external_game_analyze\` DROP FOREIGN KEY \`FK_4827f87d23748a34ca4520196d1\``);
        await queryRunner.query(`ALTER TABLE \`external_game\` DROP FOREIGN KEY \`FK_4d4db4333b41b530a46b24b3712\``);
        await queryRunner.query(`ALTER TABLE \`player\` DROP COLUMN \`littleGolemPseudo\``);
        await queryRunner.query(`ALTER TABLE \`player\` DROP COLUMN \`littleGolemPlid\``);
        await queryRunner.query(`DROP TABLE \`external_game_import_job\``);
        await queryRunner.query(`DROP TABLE \`external_game_analyze\``);
        await queryRunner.query(`DROP TABLE \`external_game\``);
    }

}
