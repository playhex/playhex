import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Optional recovery email, Discord account link, and pseudo history,
 * in their own tables to keep player table light.
 */
export class PlayerAccountEmailDiscordPseudoHistory1793491200000 implements MigrationInterface {
    name = 'PlayerAccountEmailDiscordPseudoHistory1793491200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`player_account_discord\` (\`playerId\` int NOT NULL, \`discordId\` varchar(32) NOT NULL, \`discordUsername\` varchar(64) NOT NULL, \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE INDEX \`IDX_3b79c83f51e0bf24ca08487f00\` (\`discordId\`), PRIMARY KEY (\`playerId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`player_account_email\` (\`playerId\` int NOT NULL, \`email\` varchar(254) NOT NULL, \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updatedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`playerId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`player_pseudo_history\` (\`id\` int NOT NULL AUTO_INCREMENT, \`playerId\` int NOT NULL, \`pseudo\` varchar(34) NOT NULL, \`slug\` varchar(34) NOT NULL, \`startedAt\` datetime NOT NULL, \`endedAt\` datetime NOT NULL, INDEX \`IDX_f96807e40f44cbb77039f4b0b8\` (\`playerId\`), INDEX \`IDX_e601f0edfbcaedca53012e2edf\` (\`slug\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`player_account_discord\` ADD CONSTRAINT \`FK_cb8eb44b956b21f5ea2fe2f435e\` FOREIGN KEY (\`playerId\`) REFERENCES \`player\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`player_account_email\` ADD CONSTRAINT \`FK_3b7a855d6d22de3fe5039d6feec\` FOREIGN KEY (\`playerId\`) REFERENCES \`player\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`player_pseudo_history\` ADD CONSTRAINT \`FK_f96807e40f44cbb77039f4b0b80\` FOREIGN KEY (\`playerId\`) REFERENCES \`player\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`player_pseudo_history\` DROP FOREIGN KEY \`FK_f96807e40f44cbb77039f4b0b80\``);
        await queryRunner.query(`ALTER TABLE \`player_account_email\` DROP FOREIGN KEY \`FK_3b7a855d6d22de3fe5039d6feec\``);
        await queryRunner.query(`ALTER TABLE \`player_account_discord\` DROP FOREIGN KEY \`FK_cb8eb44b956b21f5ea2fe2f435e\``);
        await queryRunner.query(`DROP INDEX \`IDX_e601f0edfbcaedca53012e2edf\` ON \`player_pseudo_history\``);
        await queryRunner.query(`DROP INDEX \`IDX_f96807e40f44cbb77039f4b0b8\` ON \`player_pseudo_history\``);
        await queryRunner.query(`DROP TABLE \`player_pseudo_history\``);
        await queryRunner.query(`DROP TABLE \`player_account_email\``);
        await queryRunner.query(`DROP INDEX \`IDX_3b79c83f51e0bf24ca08487f00\` ON \`player_account_discord\``);
        await queryRunner.query(`DROP TABLE \`player_account_discord\``);
    }
}
