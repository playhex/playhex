import { MigrationInterface, QueryRunner } from "typeorm";

export class PuzzleEdgeConnections1792281600000 implements MigrationInterface {
    name = 'PuzzleEdgeConnections1792281600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`puzzle\` ADD \`edgeConnections\` json NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`puzzle\` DROP COLUMN \`edgeConnections\``);
    }

}
