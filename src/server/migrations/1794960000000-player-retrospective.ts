import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlayerRetrospective1794960000000 implements MigrationInterface {
    name = 'PlayerRetrospective1794960000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE TABLE `player_retrospective` (`playerId` int NOT NULL, `year` smallint NOT NULL, `data` json NOT NULL, `shareCode` varchar(5) NOT NULL, `hidden` tinyint NOT NULL DEFAULT 0, `publishedAt` datetime NULL, `computedAt` datetime NOT NULL, `games1v1` int NOT NULL DEFAULT \'0\', `livePlaySeconds` int NOT NULL DEFAULT \'0\', `activeDays` smallint NOT NULL DEFAULT \'0\', `chatMessages` int NOT NULL DEFAULT \'0\', `rankedWins` int NOT NULL DEFAULT \'0\', `endRating` float NULL, `strongestOpponentBeatenRating` float NULL, `strongestBotBeatenRating` float NULL, INDEX `IDX_b5a67cc616647d5b8719b3fd1a` (`year`, `hidden`), PRIMARY KEY (`playerId`, `year`)) ENGINE=InnoDB');
        await queryRunner.query('ALTER TABLE `player_settings` ADD `retrospectiveDismissedAt` datetime NULL');
        await queryRunner.query('ALTER TABLE `player_retrospective` ADD CONSTRAINT `FK_e92fb77e132700cf03402953dbd` FOREIGN KEY (`playerId`) REFERENCES `player`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE `player_retrospective` DROP FOREIGN KEY `FK_e92fb77e132700cf03402953dbd`');
        await queryRunner.query('ALTER TABLE `player_settings` DROP COLUMN `retrospectiveDismissedAt`');
        await queryRunner.query('DROP INDEX `IDX_b5a67cc616647d5b8719b3fd1a` ON `player_retrospective`');
        await queryRunner.query('DROP TABLE `player_retrospective`');
    }
}
