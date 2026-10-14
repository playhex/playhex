import { MigrationInterface, QueryRunner } from "typeorm";

export class PuzzleComputerPlaysFirst1792108800000 implements MigrationInterface {
    name = 'PuzzleComputerPlaysFirst1792108800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`puzzle\` ADD \`computerPlaysFirst\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`puzzle\` DROP COLUMN \`computerPlaysFirst\``);
    }

}
