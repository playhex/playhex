import { MigrationInterface, QueryRunner } from "typeorm";

export class PuzzleHideDisabledCells1792022400000 implements MigrationInterface {
    name = 'PuzzleHideDisabledCells1792022400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`puzzle\` ADD \`hideDisabledCells\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`puzzle\` DROP COLUMN \`hideDisabledCells\``);
    }

}
