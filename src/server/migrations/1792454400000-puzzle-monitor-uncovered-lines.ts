import { MigrationInterface, QueryRunner } from "typeorm";

export class PuzzleMonitorUncoveredLines1792454400000 implements MigrationInterface {
    name = 'PuzzleMonitorUncoveredLines1792454400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`puzzle_monitor_uncovered_line\` (\`id\` int NOT NULL AUTO_INCREMENT, \`line\` varchar(512) NOT NULL, \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`puzzleId\` int NOT NULL, \`playerId\` int NOT NULL, UNIQUE INDEX \`IDX_a3b7daaddfb532ef10af5c92af\` (\`puzzleId\`, \`line\`, \`playerId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`puzzle_monitor_uncovered_line_ignored\` (\`id\` int NOT NULL AUTO_INCREMENT, \`line\` varchar(512) NOT NULL, \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`puzzleId\` int NOT NULL, UNIQUE INDEX \`IDX_c74e53d2ba1bdd727eab5ad214\` (\`puzzleId\`, \`line\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`puzzle_monitor_uncovered_line\` ADD CONSTRAINT \`FK_f652af1e99963b57d1c1c4a9d20\` FOREIGN KEY (\`puzzleId\`) REFERENCES \`puzzle\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`puzzle_monitor_uncovered_line\` ADD CONSTRAINT \`FK_8604130879478b856240e6e39a4\` FOREIGN KEY (\`playerId\`) REFERENCES \`player\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`puzzle_monitor_uncovered_line_ignored\` ADD CONSTRAINT \`FK_9df374141895f59902f4fbc4eaa\` FOREIGN KEY (\`puzzleId\`) REFERENCES \`puzzle\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`puzzle_monitor_uncovered_line_ignored\` DROP FOREIGN KEY \`FK_9df374141895f59902f4fbc4eaa\``);
        await queryRunner.query(`ALTER TABLE \`puzzle_monitor_uncovered_line\` DROP FOREIGN KEY \`FK_8604130879478b856240e6e39a4\``);
        await queryRunner.query(`ALTER TABLE \`puzzle_monitor_uncovered_line\` DROP FOREIGN KEY \`FK_f652af1e99963b57d1c1c4a9d20\``);
        await queryRunner.query(`DROP INDEX \`IDX_c74e53d2ba1bdd727eab5ad214\` ON \`puzzle_monitor_uncovered_line_ignored\``);
        await queryRunner.query(`DROP TABLE \`puzzle_monitor_uncovered_line_ignored\``);
        await queryRunner.query(`DROP INDEX \`IDX_a3b7daaddfb532ef10af5c92af\` ON \`puzzle_monitor_uncovered_line\``);
        await queryRunner.query(`DROP TABLE \`puzzle_monitor_uncovered_line\``);
    }

}
