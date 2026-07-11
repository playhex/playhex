import { MigrationInterface, QueryRunner } from "typeorm";

export class GamePositionBand1783637583744 implements MigrationInterface {
    name = 'GamePositionBand1783637583744'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`game_position_band\` (\`bandNo\` tinyint NOT NULL, \`bandHash\` int UNSIGNED NOT NULL, \`hostedGameId\` int NOT NULL, PRIMARY KEY (\`bandNo\`, \`bandHash\`, \`hostedGameId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`game_position_band\` ADD CONSTRAINT \`FK_game_position_band_hostedGameId\` FOREIGN KEY (\`hostedGameId\`) REFERENCES \`hosted_game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game_position_band\` DROP FOREIGN KEY \`FK_game_position_band_hostedGameId\``);
        await queryRunner.query(`DROP TABLE \`game_position_band\``);
    }

}
