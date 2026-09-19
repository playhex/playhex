import { MigrationInterface, QueryRunner } from "typeorm";

export class GameChatSubscription1789854845525 implements MigrationInterface {
    name = 'GameChatSubscription1789854845525'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`game_chat_subscription\` (\`gameId\` int NOT NULL, \`playerId\` int NOT NULL, \`enabled\` tinyint NOT NULL, \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`gameId\`, \`playerId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`game_chat_subscription\` ADD CONSTRAINT \`FK_2429c971ade27696d3a63ab425a\` FOREIGN KEY (\`gameId\`) REFERENCES \`game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`game_chat_subscription\` ADD CONSTRAINT \`FK_4f4959f214e1bbae9443b388dfa\` FOREIGN KEY (\`playerId\`) REFERENCES \`player\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game_chat_subscription\` DROP FOREIGN KEY \`FK_4f4959f214e1bbae9443b388dfa\``);
        await queryRunner.query(`ALTER TABLE \`game_chat_subscription\` DROP FOREIGN KEY \`FK_2429c971ade27696d3a63ab425a\``);
        await queryRunner.query(`DROP TABLE \`game_chat_subscription\``);
    }

}
