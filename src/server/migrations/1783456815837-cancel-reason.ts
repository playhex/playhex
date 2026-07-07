import { MigrationInterface, QueryRunner } from "typeorm";

export class CancelReason1783456815837 implements MigrationInterface {
    name = 'CancelReason1783456815837'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`hosted_game\` ADD \`cancelReason\` varchar(15) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`hosted_game\` DROP COLUMN \`cancelReason\``);
    }

}
