import { MigrationInterface, QueryRunner } from "typeorm";

export class SurveyAnswer1793750400000 implements MigrationInterface {
    name = 'SurveyAnswer1793750400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`survey_answer\` (\`id\` int NOT NULL AUTO_INCREMENT, \`text\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`survey_answer\``);
    }

}
