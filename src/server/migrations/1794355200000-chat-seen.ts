import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChatSeen1794355200000 implements MigrationInterface {
    name = 'ChatSeen1794355200000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE TABLE `game_chat_seen` (`gameId` int NOT NULL, `playerId` int NOT NULL, `seenAt` datetime(3) NOT NULL, PRIMARY KEY (`gameId`, `playerId`)) ENGINE=InnoDB');
        await queryRunner.query('CREATE TABLE `channel_chat_seen` (`channelId` int NOT NULL, `playerId` int NOT NULL, `seenAt` datetime(3) NOT NULL, PRIMARY KEY (`channelId`, `playerId`)) ENGINE=InnoDB');
        await queryRunner.query('ALTER TABLE `game_chat_seen` ADD CONSTRAINT `FK_e851556ed3d766f618d2355ec00` FOREIGN KEY (`gameId`) REFERENCES `game`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE `game_chat_seen` ADD CONSTRAINT `FK_fab5ba0d80dfe5e48e472fe9d7f` FOREIGN KEY (`playerId`) REFERENCES `player`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE `channel_chat_seen` ADD CONSTRAINT `FK_4ecc6c6c1678d079cc5923c5e48` FOREIGN KEY (`channelId`) REFERENCES `channel`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE `channel_chat_seen` ADD CONSTRAINT `FK_3a92537d111f9dd4cb68be8ac99` FOREIGN KEY (`playerId`) REFERENCES `player`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `channel_chat_seen` DROP FOREIGN KEY `FK_3a92537d111f9dd4cb68be8ac99`');
        await queryRunner.query('ALTER TABLE `channel_chat_seen` DROP FOREIGN KEY `FK_4ecc6c6c1678d079cc5923c5e48`');
        await queryRunner.query('ALTER TABLE `game_chat_seen` DROP FOREIGN KEY `FK_fab5ba0d80dfe5e48e472fe9d7f`');
        await queryRunner.query('ALTER TABLE `game_chat_seen` DROP FOREIGN KEY `FK_e851556ed3d766f618d2355ec00`');
        await queryRunner.query('DROP TABLE `channel_chat_seen`');
        await queryRunner.query('DROP TABLE `game_chat_seen`');
    }
}
