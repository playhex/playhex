import { MigrationInterface, QueryRunner } from "typeorm";

export class Ladder1790150400000 implements MigrationInterface {
    name = 'Ladder1790150400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`ladder\` (\`id\` int NOT NULL AUTO_INCREMENT, \`publicId\` char(36) NOT NULL, \`slug\` varchar(64) NOT NULL, \`name\` varchar(64) NOT NULL, \`boardsizeMin\` smallint NOT NULL, \`boardsizeMax\` smallint NOT NULL, \`timeControlType\` json NOT NULL, \`ranked\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE INDEX \`IDX_068961428d53c1351bb14559cb\` (\`publicId\`), UNIQUE INDEX \`IDX_1d737ba80114a192831ea28aa0\` (\`slug\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`ladder_challenge\` (\`id\` int NOT NULL AUTO_INCREMENT, \`publicId\` char(36) NOT NULL, \`ladderId\` int NOT NULL, \`challengerId\` int NOT NULL, \`defenderId\` int NOT NULL, \`state\` varchar(16) NOT NULL, \`boardsize\` smallint NOT NULL, \`proposedLiveTimeControlType\` json NULL, \`playedLive\` tinyint NOT NULL DEFAULT 0, \`result\` varchar(16) NULL, \`strikePlayerId\` int NULL, \`challengerPositionBefore\` int NULL, \`defenderPositionBefore\` int NULL, \`challengerPositionAfter\` int NULL, \`defenderPositionAfter\` int NULL, \`createdAt\` datetime NOT NULL, \`endedAt\` datetime NULL, \`gameId\` int NULL, INDEX \`IDX_4482d06802eac922a4acbbd2d7\` (\`ladderId\`, \`state\`), UNIQUE INDEX \`IDX_1c27a12a83a6934133ae73d7f3\` (\`publicId\`), UNIQUE INDEX \`REL_83753966f517036d63388e1573\` (\`gameId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`ladder_event\` (\`id\` int NOT NULL AUTO_INCREMENT, \`ladderId\` int NOT NULL, \`type\` varchar(32) NOT NULL, \`parameters\` json NOT NULL, \`createdAt\` datetime NOT NULL, \`playerId\` int NOT NULL, \`otherPlayerId\` int NULL, \`challengeId\` int NULL, INDEX \`IDX_2de2391fe82fd39166819a46ea\` (\`ladderId\`, \`createdAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`ladder_player\` (\`id\` int NOT NULL AUTO_INCREMENT, \`ladderId\` int NOT NULL, \`playerId\` int NOT NULL, \`state\` varchar(16) NOT NULL, \`position\` int NULL, \`leftPosition\` int NULL, \`incomingSlots\` smallint NOT NULL, \`currentDefenseStreak\` int NOT NULL DEFAULT '0', \`bestDefenseStreak\` int NOT NULL DEFAULT '0', \`consecutiveChallengeWins\` int NOT NULL DEFAULT '0', \`giantSlayerCount\` int NOT NULL DEFAULT '0', \`climberCount\` int NOT NULL DEFAULT '0', \`joinedAt\` datetime NOT NULL, \`leftAt\` datetime NULL, \`rejoinableAt\` datetime NULL, \`lastGameEndedAt\` datetime NULL, UNIQUE INDEX \`IDX_db282126c844c3f4f5bca8f0fe\` (\`ladderId\`, \`playerId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`ladder_reign\` (\`id\` int NOT NULL AUTO_INCREMENT, \`ladderId\` int NOT NULL, \`playerId\` int NOT NULL, \`startedAt\` datetime NOT NULL, \`endedAt\` datetime NULL, \`defenses\` int NOT NULL DEFAULT '0', PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`ladder_challenge\` ADD CONSTRAINT \`FK_9425c634cb4af55b579e3830aee\` FOREIGN KEY (\`ladderId\`) REFERENCES \`ladder\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`ladder_challenge\` ADD CONSTRAINT \`FK_7d8ab9cd90afc99e699cf46cf7e\` FOREIGN KEY (\`challengerId\`) REFERENCES \`player\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`ladder_challenge\` ADD CONSTRAINT \`FK_40a0358e4ec79299aa987928d17\` FOREIGN KEY (\`defenderId\`) REFERENCES \`player\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`ladder_challenge\` ADD CONSTRAINT \`FK_83753966f517036d63388e1573e\` FOREIGN KEY (\`gameId\`) REFERENCES \`game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`ladder_challenge\` ADD CONSTRAINT \`FK_be21d4f72564c20cdc9382494e8\` FOREIGN KEY (\`strikePlayerId\`) REFERENCES \`player\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`ladder_event\` ADD CONSTRAINT \`FK_8c1c79455be8e90c1175369717f\` FOREIGN KEY (\`ladderId\`) REFERENCES \`ladder\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`ladder_event\` ADD CONSTRAINT \`FK_70b10e368adbb96cb4ee3220515\` FOREIGN KEY (\`playerId\`) REFERENCES \`player\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`ladder_event\` ADD CONSTRAINT \`FK_8d8daa618ce2387a42128d0e6c1\` FOREIGN KEY (\`otherPlayerId\`) REFERENCES \`player\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`ladder_event\` ADD CONSTRAINT \`FK_82772e3872355fb8617196be0a8\` FOREIGN KEY (\`challengeId\`) REFERENCES \`ladder_challenge\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`ladder_player\` ADD CONSTRAINT \`FK_9af70c3a9bb6f63f42197d009fe\` FOREIGN KEY (\`ladderId\`) REFERENCES \`ladder\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`ladder_player\` ADD CONSTRAINT \`FK_cb98cb72d063fdaf8e24ad810e0\` FOREIGN KEY (\`playerId\`) REFERENCES \`player\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`ladder_reign\` ADD CONSTRAINT \`FK_b67d3f8af186a4fc3bd0a7046bf\` FOREIGN KEY (\`ladderId\`) REFERENCES \`ladder\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`ladder_reign\` ADD CONSTRAINT \`FK_72a7118873ca21ad28368e77eb6\` FOREIGN KEY (\`playerId\`) REFERENCES \`player\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`INSERT INTO \`ladder\` (\`publicId\`, \`slug\`, \`name\`, \`boardsizeMin\`, \`boardsizeMax\`, \`timeControlType\`, \`ranked\`) VALUES ('6b1f2f64-7f0e-4c8e-9f3a-2d4c1e5a7b90', 'main', 'King of the Hill', 11, 19, '{"family":"fischer","options":{"initialTime":259200000,"timeIncrement":86400000,"maxTime":259200000}}', 1)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`ladder_reign\` DROP FOREIGN KEY \`FK_72a7118873ca21ad28368e77eb6\``);
        await queryRunner.query(`ALTER TABLE \`ladder_reign\` DROP FOREIGN KEY \`FK_b67d3f8af186a4fc3bd0a7046bf\``);
        await queryRunner.query(`ALTER TABLE \`ladder_player\` DROP FOREIGN KEY \`FK_cb98cb72d063fdaf8e24ad810e0\``);
        await queryRunner.query(`ALTER TABLE \`ladder_player\` DROP FOREIGN KEY \`FK_9af70c3a9bb6f63f42197d009fe\``);
        await queryRunner.query(`ALTER TABLE \`ladder_event\` DROP FOREIGN KEY \`FK_82772e3872355fb8617196be0a8\``);
        await queryRunner.query(`ALTER TABLE \`ladder_event\` DROP FOREIGN KEY \`FK_8d8daa618ce2387a42128d0e6c1\``);
        await queryRunner.query(`ALTER TABLE \`ladder_event\` DROP FOREIGN KEY \`FK_70b10e368adbb96cb4ee3220515\``);
        await queryRunner.query(`ALTER TABLE \`ladder_event\` DROP FOREIGN KEY \`FK_8c1c79455be8e90c1175369717f\``);
        await queryRunner.query(`ALTER TABLE \`ladder_challenge\` DROP FOREIGN KEY \`FK_be21d4f72564c20cdc9382494e8\``);
        await queryRunner.query(`ALTER TABLE \`ladder_challenge\` DROP FOREIGN KEY \`FK_83753966f517036d63388e1573e\``);
        await queryRunner.query(`ALTER TABLE \`ladder_challenge\` DROP FOREIGN KEY \`FK_40a0358e4ec79299aa987928d17\``);
        await queryRunner.query(`ALTER TABLE \`ladder_challenge\` DROP FOREIGN KEY \`FK_7d8ab9cd90afc99e699cf46cf7e\``);
        await queryRunner.query(`ALTER TABLE \`ladder_challenge\` DROP FOREIGN KEY \`FK_9425c634cb4af55b579e3830aee\``);
        await queryRunner.query(`DROP TABLE \`ladder_reign\``);
        await queryRunner.query(`DROP INDEX \`IDX_db282126c844c3f4f5bca8f0fe\` ON \`ladder_player\``);
        await queryRunner.query(`DROP TABLE \`ladder_player\``);
        await queryRunner.query(`DROP INDEX \`IDX_2de2391fe82fd39166819a46ea\` ON \`ladder_event\``);
        await queryRunner.query(`DROP TABLE \`ladder_event\``);
        await queryRunner.query(`DROP INDEX \`REL_83753966f517036d63388e1573\` ON \`ladder_challenge\``);
        await queryRunner.query(`DROP INDEX \`IDX_1c27a12a83a6934133ae73d7f3\` ON \`ladder_challenge\``);
        await queryRunner.query(`DROP INDEX \`IDX_4482d06802eac922a4acbbd2d7\` ON \`ladder_challenge\``);
        await queryRunner.query(`DROP TABLE \`ladder_challenge\``);
        await queryRunner.query(`DROP INDEX \`IDX_1d737ba80114a192831ea28aa0\` ON \`ladder\``);
        await queryRunner.query(`DROP INDEX \`IDX_068961428d53c1351bb14559cb\` ON \`ladder\``);
        await queryRunner.query(`DROP TABLE \`ladder\``);
    }

}
