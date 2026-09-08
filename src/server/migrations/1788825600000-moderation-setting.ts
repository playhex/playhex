import { MigrationInterface, QueryRunner } from "typeorm";

export class ModerationSetting1788825600000 implements MigrationInterface {
    name = 'ModerationSetting1788825600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`moderation_setting\` (\`key\` varchar(64) NOT NULL, \`value\` text NOT NULL, PRIMARY KEY (\`key\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`moderation_setting\``);
    }

}
