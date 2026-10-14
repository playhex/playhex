import { MigrationInterface, QueryRunner } from "typeorm";

export class TournamentHidden1792195200000 implements MigrationInterface {
    name = 'TournamentHidden1792195200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournament\` ADD \`hidden\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`tournament\` DROP COLUMN \`hidden\``);
    }

}
