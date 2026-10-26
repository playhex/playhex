import { MigrationInterface, QueryRunner } from "typeorm";

export class PuzzleEdgeConnections1792368000000 implements MigrationInterface {
    name = 'PuzzleEdgeConnections1792368000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`puzzle\` ADD \`edgeConnections\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`puzzle\` ADD \`fixedFill\` json NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`puzzle\` DROP COLUMN \`fixedFill\``);
        await queryRunner.query(`ALTER TABLE \`puzzle\` DROP COLUMN \`edgeConnections\``);
    }

}
