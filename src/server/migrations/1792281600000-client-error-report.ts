import { MigrationInterface, QueryRunner } from "typeorm";

export class ClientErrorReport1792281600000 implements MigrationInterface {
    name = 'ClientErrorReport1792281600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`client_error_report\` (\`id\` int NOT NULL AUTO_INCREMENT, \`type\` varchar(32) NOT NULL, \`message\` text NOT NULL, \`stack\` text NULL, \`diagnostic\` text NOT NULL, \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`playerId\` int NULL, INDEX \`IDX_55023c07b83aa837b22e333a82\` (\`createdAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`client_error_report\` ADD CONSTRAINT \`FK_25680270cee1eeb72d76e581d23\` FOREIGN KEY (\`playerId\`) REFERENCES \`player\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`client_error_report\` DROP FOREIGN KEY \`FK_25680270cee1eeb72d76e581d23\``);
        await queryRunner.query(`DROP INDEX \`IDX_55023c07b83aa837b22e333a82\` ON \`client_error_report\``);
        await queryRunner.query(`DROP TABLE \`client_error_report\``);
    }

}
