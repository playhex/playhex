import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Move Little Golem account columns from player to their own table,
 * to keep player table light: few players link a Little Golem account.
 */
export class PlayerLittleGolemAccount1791590400000 implements MigrationInterface {
    name = 'PlayerLittleGolemAccount1791590400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`player_little_golem_account\` (\`playerId\` int NOT NULL, \`plid\` int NOT NULL, \`pseudo\` varchar(64) NOT NULL, PRIMARY KEY (\`playerId\`)) ENGINE=InnoDB`);

        await queryRunner.query(`
            insert into player_little_golem_account
            (
                playerId,
                plid,
                pseudo
            )
            select
                id,
                littleGolemPlid,
                coalesce(littleGolemPseudo, cast(littleGolemPlid as char))
            from player
            where littleGolemPlid is not null
        `);

        await queryRunner.query(`ALTER TABLE \`player_little_golem_account\` ADD CONSTRAINT \`FK_c9c0a26d50c4e51abbc50e7be8a\` FOREIGN KEY (\`playerId\`) REFERENCES \`player\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`player\` DROP COLUMN \`littleGolemPseudo\``);
        await queryRunner.query(`ALTER TABLE \`player\` DROP COLUMN \`littleGolemPlid\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`player\` ADD \`littleGolemPlid\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`player\` ADD \`littleGolemPseudo\` varchar(64) NULL`);

        await queryRunner.query(`
            UPDATE player p
            JOIN player_little_golem_account plga ON plga.playerId = p.id
            SET p.littleGolemPlid = plga.plid, p.littleGolemPseudo = plga.pseudo
        `);

        await queryRunner.query(`ALTER TABLE \`player_little_golem_account\` DROP FOREIGN KEY \`FK_c9c0a26d50c4e51abbc50e7be8a\``);
        await queryRunner.query(`DROP TABLE \`player_little_golem_account\``);
    }

}
