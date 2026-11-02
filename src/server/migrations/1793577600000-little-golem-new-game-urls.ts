import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Little Golem moved to a new website, old game pages are gone:
 * - https://old.littlegolem.net/jsp/game/game.jsp?gid=2128539 does not exist anymore
 * - https://littlegolem.net/jsp/game/game.jsp?gid=2128539 redirects to homepage
 *
 * Replaces them by https://www.littlegolem.net/web/game?id=2128539,
 * gid taken from externalId "LG:2128539".
 */
export class LittleGolemNewGameUrls1793577600000 implements MigrationInterface {
    name = 'LittleGolemNewGameUrls1793577600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE \`external_game\`
            SET \`sourceUrl\` = CONCAT('https://www.littlegolem.net/web/game?id=', SUBSTRING(\`externalId\`, 4))
            WHERE \`externalId\` LIKE 'LG:%'
            AND \`sourceUrl\` LIKE '%littlegolem.net/jsp/game/game.jsp%'
        `);
    }

    public async down(): Promise<void> {
        // Old urls are dead, nothing to restore
    }

}
