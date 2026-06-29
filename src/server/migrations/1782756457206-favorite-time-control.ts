import { MigrationInterface, QueryRunner } from "typeorm";

export class FavoriteTimeControl1782756457206 implements MigrationInterface {
    name = 'FavoriteTimeControl1782756457206'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`player_favorite_time_control\` (\`id\` int NOT NULL AUTO_INCREMENT, \`playerId\` int NOT NULL, \`name\` varchar(64) NULL, \`cadency\` varchar(16) NOT NULL, \`timeControlType\` json NOT NULL, \`order\` smallint NOT NULL DEFAULT '0', INDEX \`IDX_51574a2d859caaba97172dc559\` (\`playerId\`, \`order\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`player_favorite_time_control\` ADD CONSTRAINT \`FK_4d69bdfddebe8471b9ecc947a5d\` FOREIGN KEY (\`playerId\`) REFERENCES \`player\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`player_favorite_time_control\` DROP FOREIGN KEY \`FK_4d69bdfddebe8471b9ecc947a5d\``);
        await queryRunner.query(`DROP INDEX \`IDX_51574a2d859caaba97172dc559\` ON \`player_favorite_time_control\``);
        await queryRunner.query(`DROP TABLE \`player_favorite_time_control\``);
    }

}
