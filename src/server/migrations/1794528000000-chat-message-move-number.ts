import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChatMessageMoveNumber1794528000000 implements MigrationInterface {
    name = 'ChatMessageMoveNumber1794528000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `chat_message` ADD `moveNumber` int NULL');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `chat_message` DROP COLUMN `moveNumber`');
    }
}
