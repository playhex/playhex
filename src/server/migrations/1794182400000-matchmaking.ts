import { MigrationInterface, QueryRunner } from 'typeorm';

export class Matchmaking1794182400000 implements MigrationInterface {
    name = 'Matchmaking1794182400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE TABLE `matchmaking_event` (`id` int NOT NULL AUTO_INCREMENT, `type` varchar(16) NOT NULL, `playerId` int NOT NULL, `parameters` json NOT NULL, `createdAt` datetime NOT NULL, `otherPlayerId` int NULL, `gameId` int NULL, INDEX `IDX_fa98601d1f7e141c3dff79a3a1` (`playerId`, `type`), INDEX `IDX_19b9afe1a9f158e5a22e2eea64` (`createdAt`), PRIMARY KEY (`id`)) ENGINE=InnoDB');
        await queryRunner.query('ALTER TABLE `player_settings` ADD `matchmakingPreferences` json NULL');
        await queryRunner.query('ALTER TABLE `matchmaking_event` ADD CONSTRAINT `FK_65b5ac33a7a59d97fb9d3fb28ce` FOREIGN KEY (`playerId`) REFERENCES `player`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE `matchmaking_event` ADD CONSTRAINT `FK_245d797b8943140c67cde035baf` FOREIGN KEY (`otherPlayerId`) REFERENCES `player`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE `matchmaking_event` ADD CONSTRAINT `FK_c48323696a237cc83aed62622e5` FOREIGN KEY (`gameId`) REFERENCES `game`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `matchmaking_event` DROP FOREIGN KEY `FK_c48323696a237cc83aed62622e5`');
        await queryRunner.query('ALTER TABLE `matchmaking_event` DROP FOREIGN KEY `FK_245d797b8943140c67cde035baf`');
        await queryRunner.query('ALTER TABLE `matchmaking_event` DROP FOREIGN KEY `FK_65b5ac33a7a59d97fb9d3fb28ce`');
        await queryRunner.query('ALTER TABLE `player_settings` DROP COLUMN `matchmakingPreferences`');
        await queryRunner.query('DROP TABLE `matchmaking_event`');
    }
}
