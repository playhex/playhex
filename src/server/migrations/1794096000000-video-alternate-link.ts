import { MigrationInterface, QueryRunner } from "typeorm";

export class VideoAlternateLink1794096000000 implements MigrationInterface {
    name = 'VideoAlternateLink1794096000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`video_alternate_link\` (\`id\` int NOT NULL AUTO_INCREMENT, \`url\` varchar(512) NOT NULL, \`position\` smallint UNSIGNED NOT NULL, \`videoId\` int NOT NULL, INDEX \`IDX_de8856315121f7f1aa005aa278\` (\`videoId\`, \`position\`), UNIQUE INDEX \`IDX_ba1359e39258ca77275a5468b7\` (\`url\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`video_alternate_link\` ADD CONSTRAINT \`FK_f6c730722ab6a313c7d1b757190\` FOREIGN KEY (\`videoId\`) REFERENCES \`video\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`video_alternate_link\` DROP FOREIGN KEY \`FK_f6c730722ab6a313c7d1b757190\``);
        await queryRunner.query(`DROP INDEX \`IDX_ba1359e39258ca77275a5468b7\` ON \`video_alternate_link\``);
        await queryRunner.query(`DROP INDEX \`IDX_de8856315121f7f1aa005aa278\` ON \`video_alternate_link\``);
        await queryRunner.query(`DROP TABLE \`video_alternate_link\``);
    }

}
