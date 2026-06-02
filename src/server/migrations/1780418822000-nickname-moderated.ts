import { MigrationInterface, QueryRunner } from "typeorm";

export class NicknameModerated1780418822000 implements MigrationInterface {
    name = 'NicknameModerated1780418822000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE player_moderation_action ADD nicknameModerated varchar(34) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE player_moderation_action DROP COLUMN nicknameModerated`);
    }
}
