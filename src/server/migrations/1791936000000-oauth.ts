import { MigrationInterface, QueryRunner } from "typeorm";

export class Oauth1791936000000 implements MigrationInterface {
    name = 'Oauth1791936000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`oauth_client\` (\`id\` int NOT NULL AUTO_INCREMENT, \`clientId\` varchar(64) NOT NULL, \`clientSecret\` varchar(128) NULL, \`name\` varchar(64) NOT NULL, \`logoUri\` varchar(255) NOT NULL, \`author\` varchar(128) NOT NULL, \`websiteUri\` varchar(255) NULL, \`description\` text NULL, \`redirectUris\` json NOT NULL, \`grantTypes\` json NOT NULL, \`allowedScopes\` varchar(255) NOT NULL DEFAULT 'openid offline_access read write', \`enabled\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), UNIQUE INDEX \`IDX_0c623b6d56742bcfaedc40302f\` (\`clientId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`oauth_payload\` (\`id\` varchar(255) NOT NULL, \`kind\` varchar(32) NOT NULL, \`payload\` json NOT NULL, \`grantId\` varchar(255) NULL, \`userCode\` varchar(64) NULL, \`uid\` varchar(255) NULL, \`accountId\` varchar(36) NULL, \`expiresAt\` datetime(3) NULL, \`consumedAt\` datetime(3) NULL, INDEX \`IDX_754cc999ce746129c4c08909f8\` (\`grantId\`), INDEX \`IDX_27c9d53d224bd9ba84a335f238\` (\`userCode\`), INDEX \`IDX_6b55c9e90e96a54da96a3f0564\` (\`uid\`), INDEX \`IDX_686877607884879395d7e51738\` (\`accountId\`), INDEX \`IDX_1eaad62063cea83ebfa1199a52\` (\`expiresAt\`), PRIMARY KEY (\`id\`, \`kind\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_1eaad62063cea83ebfa1199a52\` ON \`oauth_payload\``);
        await queryRunner.query(`DROP INDEX \`IDX_686877607884879395d7e51738\` ON \`oauth_payload\``);
        await queryRunner.query(`DROP INDEX \`IDX_6b55c9e90e96a54da96a3f0564\` ON \`oauth_payload\``);
        await queryRunner.query(`DROP INDEX \`IDX_27c9d53d224bd9ba84a335f238\` ON \`oauth_payload\``);
        await queryRunner.query(`DROP INDEX \`IDX_754cc999ce746129c4c08909f8\` ON \`oauth_payload\``);
        await queryRunner.query(`DROP TABLE \`oauth_payload\``);
        await queryRunner.query(`DROP INDEX \`IDX_0c623b6d56742bcfaedc40302f\` ON \`oauth_client\``);
        await queryRunner.query(`DROP TABLE \`oauth_client\``);
    }

}
