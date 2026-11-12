import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChatMessageVisibility1794268800000 implements MigrationInterface {
    name = 'ChatMessageVisibility1794268800000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `chat_message` ADD `visibility` varchar(16) NOT NULL DEFAULT \'public\'');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `chat_message` DROP COLUMN `visibility`');
    }
}
