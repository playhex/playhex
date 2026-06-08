import { MigrationInterface, QueryRunner } from "typeorm";

export class IpBanning1780954734519 implements MigrationInterface {
    name = 'IpBanning1780954734519'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`banned_ip\` (\`id\` int NOT NULL AUTO_INCREMENT, \`ip\` varchar(45) NOT NULL, \`bannedAt\` datetime NOT NULL, \`bannedUntil\` datetime NULL, \`reason\` text NOT NULL, UNIQUE INDEX \`IDX_70671f15d0b5eca41ad754d94e\` (\`ip\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`player_ip\` (\`id\` int NOT NULL AUTO_INCREMENT, \`ip\` varchar(45) NOT NULL, \`lastUsedAt\` datetime NOT NULL, \`playerId\` int NULL, UNIQUE INDEX \`IDX_dba2b4cb9daa48398d7cc5e695\` (\`playerId\`, \`ip\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`player_ip\` ADD CONSTRAINT \`FK_7a781e54ea63a46213d265fd6bc\` FOREIGN KEY (\`playerId\`) REFERENCES \`player\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`player_ip\` DROP FOREIGN KEY \`FK_7a781e54ea63a46213d265fd6bc\``);
        await queryRunner.query(`DROP INDEX \`IDX_dba2b4cb9daa48398d7cc5e695\` ON \`player_ip\``);
        await queryRunner.query(`DROP TABLE \`player_ip\``);
        await queryRunner.query(`DROP INDEX \`IDX_70671f15d0b5eca41ad754d94e\` ON \`banned_ip\``);
        await queryRunner.query(`DROP TABLE \`banned_ip\``);
    }

}
