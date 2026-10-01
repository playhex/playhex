import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Katahex bots config: replace treeSearch boolean by maxPlayouts (0 for model only).
 */
export class KatahexMaxPlayouts1790812800000 implements MigrationInterface {
    name = 'KatahexMaxPlayouts1790812800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE \`ai_config\` SET \`config\` = JSON_OBJECT('maxPlayouts', IF(JSON_EXTRACT(\`config\`, '$.treeSearch') = true, 400, 0)) WHERE \`engine\` = 'katahex'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE \`ai_config\` SET \`config\` = JSON_OBJECT('treeSearch', JSON_EXTRACT(\`config\`, '$.maxPlayouts') > 0) WHERE \`engine\` = 'katahex'`);
    }

}
