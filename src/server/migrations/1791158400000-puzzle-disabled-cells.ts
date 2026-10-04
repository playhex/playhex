import { MigrationInterface, QueryRunner } from "typeorm";

export class PuzzleDisabledCells1791158400000 implements MigrationInterface {
    name = 'PuzzleDisabledCells1791158400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`puzzle\` ADD \`disabledCells\` text NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`puzzle\` DROP COLUMN \`disabledCells\``);
    }

}
