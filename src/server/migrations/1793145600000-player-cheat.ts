import { MigrationInterface, QueryRunner } from "typeorm";

export class PlayerCheat1793145600000 implements MigrationInterface {
    name = 'PlayerCheat1793145600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`player_cheat\` (\`id\` int NOT NULL AUTO_INCREMENT, \`playerId\` int NOT NULL, \`gameId\` int NULL, \`reason\` varchar(255) NOT NULL, \`createdAt\` datetime NOT NULL, UNIQUE INDEX \`IDX_621bba384a8daf2dae7dc8d2e5\` (\`playerId\`, \`gameId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`player_cheat\` ADD CONSTRAINT \`FK_830167125bc4912c38cfceb86b6\` FOREIGN KEY (\`playerId\`) REFERENCES \`player\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`player_cheat\` ADD CONSTRAINT \`FK_85458873ead3c84a28dd05f062c\` FOREIGN KEY (\`gameId\`) REFERENCES \`game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`player_cheat\` DROP FOREIGN KEY \`FK_85458873ead3c84a28dd05f062c\``);
        await queryRunner.query(`ALTER TABLE \`player_cheat\` DROP FOREIGN KEY \`FK_830167125bc4912c38cfceb86b6\``);
        await queryRunner.query(`DROP INDEX \`IDX_621bba384a8daf2dae7dc8d2e5\` ON \`player_cheat\``);
        await queryRunner.query(`DROP TABLE \`player_cheat\``);
    }
}
