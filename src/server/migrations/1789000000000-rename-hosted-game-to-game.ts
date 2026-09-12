import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * HostedGame entity has been renamed to Game.
 *
 * Tables and foreign key columns are renamed in place (RENAME TABLE /
 * RENAME COLUMN) so existing rows are preserved. Foreign keys and the
 * indexes TypeORM generates a name for are dropped and recreated, because
 * their names are hashes derived from the table and column names: without
 * this, every following `migration:generate` would report a permanent drift.
 *
 * Explicitly named indexes (index_endedAt, index_state_endedAt, ...) keep
 * their name and, importantly, their manually applied DESC order.
 */
export class RenameHostedGameToGame1789000000000 implements MigrationInterface {
    name = 'RenameHostedGameToGame1789000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop every foreign key involving hosted_game, plus the ones whose
        // generated name depends on a renamed table or column.
        await queryRunner.query(`ALTER TABLE \`chat_message\` DROP FOREIGN KEY \`FK_c11c5541b19938027069b21ef66\``);
        await queryRunner.query(`ALTER TABLE \`conditional_moves\` DROP FOREIGN KEY \`FK_59ba669f0f2f106699368e147cb\``);
        await queryRunner.query(`ALTER TABLE \`game_analyze\` DROP FOREIGN KEY \`FK_0b5fa1ca52d143efd83c509ae79\``);
        await queryRunner.query(`ALTER TABLE \`player_notification\` DROP FOREIGN KEY \`FK_a579029a5b14be3e6e13a8616ea\``);
        await queryRunner.query(`ALTER TABLE \`tournament_match\` DROP FOREIGN KEY \`FK_c274da5202ba2bfed1b709bd91b\``);
        await queryRunner.query(`ALTER TABLE \`hosted_game_to_player\` DROP FOREIGN KEY \`FK_fdf42b21f9f53fc1591693f3dab\``);
        await queryRunner.query(`ALTER TABLE \`hosted_game_to_player\` DROP FOREIGN KEY \`FK_a8b097c56ee69fdddf730e7cf78\``);
        await queryRunner.query(`ALTER TABLE \`rating_games_hosted_game\` DROP FOREIGN KEY \`FK_8a004a11c3f59b65cb9af2f58ea\``);
        await queryRunner.query(`ALTER TABLE \`rating_games_hosted_game\` DROP FOREIGN KEY \`FK_870f3e487e4342542fe7f959d27\``);
        await queryRunner.query(`ALTER TABLE \`hosted_game\` DROP FOREIGN KEY \`FK_b1e0077ad74acda2ff6850016db\``);
        await queryRunner.query(`ALTER TABLE \`hosted_game\` DROP FOREIGN KEY \`FK_9bf2411e82c38cfd8af4f4c6419\``);
        await queryRunner.query(`ALTER TABLE \`hosted_game\` DROP FOREIGN KEY \`FK_8485625a8b08f4e466a677c0ff1\``);

        // Tables
        await queryRunner.query(`RENAME TABLE \`hosted_game\` TO \`game\``);
        await queryRunner.query(`RENAME TABLE \`hosted_game_to_player\` TO \`game_to_player\``);
        await queryRunner.query(`RENAME TABLE \`rating_games_hosted_game\` TO \`rating_games_game\``);

        // Foreign key columns
        await queryRunner.query(`ALTER TABLE \`chat_message\` RENAME COLUMN \`hostedGameId\` TO \`gameId\``);
        await queryRunner.query(`ALTER TABLE \`conditional_moves\` RENAME COLUMN \`hostedGameId\` TO \`gameId\``);
        await queryRunner.query(`ALTER TABLE \`game_analyze\` RENAME COLUMN \`hostedGameId\` TO \`gameId\``);
        await queryRunner.query(`ALTER TABLE \`player_notification\` RENAME COLUMN \`hostedGameId\` TO \`gameId\``);
        await queryRunner.query(`ALTER TABLE \`tournament_match\` RENAME COLUMN \`hostedGameId\` TO \`gameId\``);
        await queryRunner.query(`ALTER TABLE \`game_to_player\` RENAME COLUMN \`hostedGameId\` TO \`gameId\``);
        await queryRunner.query(`ALTER TABLE \`rating_games_game\` RENAME COLUMN \`hostedGameId\` TO \`gameId\``);

        // Generated index names
        await queryRunner.query(`ALTER TABLE \`game\` RENAME INDEX \`IDX_0ba44d40b3239783f505eeb25d\` TO \`IDX_91cb1ab8efdba2723ec6c21b43\``);
        await queryRunner.query(`ALTER TABLE \`game\` RENAME INDEX \`IDX_7a3457cfa4a21186667d094da8\` TO \`IDX_f630fa049348abe2745e28f223\``);
        await queryRunner.query(`ALTER TABLE \`game\` RENAME INDEX \`IDX_f76de6ed10d8423f5282f4e022\` TO \`IDX_2eec005ba0f868c48de65676e7\``);
        await queryRunner.query(`ALTER TABLE \`game\` RENAME INDEX \`REL_b1e0077ad74acda2ff6850016d\` TO \`REL_a2cea3d70e8bfb857a7eddf035\``);
        await queryRunner.query(`ALTER TABLE \`game\` RENAME INDEX \`REL_9bf2411e82c38cfd8af4f4c641\` TO \`REL_dab9741d058ba78a68f952a9be\``);
        await queryRunner.query(`ALTER TABLE \`game\` RENAME INDEX \`FK_8485625a8b08f4e466a677c0ff1\` TO \`FK_4084468356497d7dcedd09502ff\``);
        await queryRunner.query(`ALTER TABLE \`game_to_player\` RENAME INDEX \`FK_a8b097c56ee69fdddf730e7cf78\` TO \`FK_dd7099443125aded7985aa32801\``);
        await queryRunner.query(`ALTER TABLE \`chat_message\` RENAME INDEX \`FK_c11c5541b19938027069b21ef66\` TO \`FK_51c4788a4d9874ddae11c13b876\``);
        await queryRunner.query(`ALTER TABLE \`player_notification\` RENAME INDEX \`FK_a579029a5b14be3e6e13a8616ea\` TO \`FK_b5d87afc8e12b8b876dd3398a8e\``);
        await queryRunner.query(`ALTER TABLE \`tournament_match\` RENAME INDEX \`REL_c274da5202ba2bfed1b709bd91\` TO \`REL_207d236ca6bcc665d005e8f145\``);
        await queryRunner.query(`ALTER TABLE \`rating_games_game\` RENAME INDEX \`IDX_870f3e487e4342542fe7f959d2\` TO \`IDX_fdd0d3ce8cae97db486e255d91\``);
        await queryRunner.query(`ALTER TABLE \`rating_games_game\` RENAME INDEX \`IDX_8a004a11c3f59b65cb9af2f58e\` TO \`IDX_8dd6a9e429edbc3b1fb3939fa5\``);

        // Foreign keys, back with their new generated names
        await queryRunner.query(`ALTER TABLE \`chat_message\` ADD CONSTRAINT \`FK_51c4788a4d9874ddae11c13b876\` FOREIGN KEY (\`gameId\`) REFERENCES \`game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`conditional_moves\` ADD CONSTRAINT \`FK_657d673a541a87774a2cee06518\` FOREIGN KEY (\`gameId\`) REFERENCES \`game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`game_analyze\` ADD CONSTRAINT \`FK_da67cceff6789a44774bf20b774\` FOREIGN KEY (\`gameId\`) REFERENCES \`game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`player_notification\` ADD CONSTRAINT \`FK_b5d87afc8e12b8b876dd3398a8e\` FOREIGN KEY (\`gameId\`) REFERENCES \`game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`tournament_match\` ADD CONSTRAINT \`FK_207d236ca6bcc665d005e8f145c\` FOREIGN KEY (\`gameId\`) REFERENCES \`game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`game_to_player\` ADD CONSTRAINT \`FK_50fb784588fd6921697f905ea85\` FOREIGN KEY (\`gameId\`) REFERENCES \`game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`game_to_player\` ADD CONSTRAINT \`FK_dd7099443125aded7985aa32801\` FOREIGN KEY (\`playerId\`) REFERENCES \`player\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`rating_games_game\` ADD CONSTRAINT \`FK_fdd0d3ce8cae97db486e255d918\` FOREIGN KEY (\`ratingId\`) REFERENCES \`rating\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`rating_games_game\` ADD CONSTRAINT \`FK_8dd6a9e429edbc3b1fb3939fa5f\` FOREIGN KEY (\`gameId\`) REFERENCES \`game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`game\` ADD CONSTRAINT \`FK_4084468356497d7dcedd09502ff\` FOREIGN KEY (\`hostId\`) REFERENCES \`player\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`game\` ADD CONSTRAINT \`FK_a2cea3d70e8bfb857a7eddf0358\` FOREIGN KEY (\`rematchId\`) REFERENCES \`game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`game\` ADD CONSTRAINT \`FK_dab9741d058ba78a68f952a9bec\` FOREIGN KEY (\`rematchedFromId\`) REFERENCES \`game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`game\` DROP FOREIGN KEY \`FK_dab9741d058ba78a68f952a9bec\``);
        await queryRunner.query(`ALTER TABLE \`game\` DROP FOREIGN KEY \`FK_a2cea3d70e8bfb857a7eddf0358\``);
        await queryRunner.query(`ALTER TABLE \`game\` DROP FOREIGN KEY \`FK_4084468356497d7dcedd09502ff\``);
        await queryRunner.query(`ALTER TABLE \`rating_games_game\` DROP FOREIGN KEY \`FK_8dd6a9e429edbc3b1fb3939fa5f\``);
        await queryRunner.query(`ALTER TABLE \`rating_games_game\` DROP FOREIGN KEY \`FK_fdd0d3ce8cae97db486e255d918\``);
        await queryRunner.query(`ALTER TABLE \`game_to_player\` DROP FOREIGN KEY \`FK_dd7099443125aded7985aa32801\``);
        await queryRunner.query(`ALTER TABLE \`game_to_player\` DROP FOREIGN KEY \`FK_50fb784588fd6921697f905ea85\``);
        await queryRunner.query(`ALTER TABLE \`tournament_match\` DROP FOREIGN KEY \`FK_207d236ca6bcc665d005e8f145c\``);
        await queryRunner.query(`ALTER TABLE \`player_notification\` DROP FOREIGN KEY \`FK_b5d87afc8e12b8b876dd3398a8e\``);
        await queryRunner.query(`ALTER TABLE \`game_analyze\` DROP FOREIGN KEY \`FK_da67cceff6789a44774bf20b774\``);
        await queryRunner.query(`ALTER TABLE \`conditional_moves\` DROP FOREIGN KEY \`FK_657d673a541a87774a2cee06518\``);
        await queryRunner.query(`ALTER TABLE \`chat_message\` DROP FOREIGN KEY \`FK_51c4788a4d9874ddae11c13b876\``);

        await queryRunner.query(`ALTER TABLE \`rating_games_game\` RENAME INDEX \`IDX_8dd6a9e429edbc3b1fb3939fa5\` TO \`IDX_8a004a11c3f59b65cb9af2f58e\``);
        await queryRunner.query(`ALTER TABLE \`rating_games_game\` RENAME INDEX \`IDX_fdd0d3ce8cae97db486e255d91\` TO \`IDX_870f3e487e4342542fe7f959d2\``);
        await queryRunner.query(`ALTER TABLE \`tournament_match\` RENAME INDEX \`REL_207d236ca6bcc665d005e8f145\` TO \`REL_c274da5202ba2bfed1b709bd91\``);
        await queryRunner.query(`ALTER TABLE \`player_notification\` RENAME INDEX \`FK_b5d87afc8e12b8b876dd3398a8e\` TO \`FK_a579029a5b14be3e6e13a8616ea\``);
        await queryRunner.query(`ALTER TABLE \`chat_message\` RENAME INDEX \`FK_51c4788a4d9874ddae11c13b876\` TO \`FK_c11c5541b19938027069b21ef66\``);
        await queryRunner.query(`ALTER TABLE \`game_to_player\` RENAME INDEX \`FK_dd7099443125aded7985aa32801\` TO \`FK_a8b097c56ee69fdddf730e7cf78\``);
        await queryRunner.query(`ALTER TABLE \`game\` RENAME INDEX \`FK_4084468356497d7dcedd09502ff\` TO \`FK_8485625a8b08f4e466a677c0ff1\``);
        await queryRunner.query(`ALTER TABLE \`game\` RENAME INDEX \`REL_dab9741d058ba78a68f952a9be\` TO \`REL_9bf2411e82c38cfd8af4f4c641\``);
        await queryRunner.query(`ALTER TABLE \`game\` RENAME INDEX \`REL_a2cea3d70e8bfb857a7eddf035\` TO \`REL_b1e0077ad74acda2ff6850016d\``);
        await queryRunner.query(`ALTER TABLE \`game\` RENAME INDEX \`IDX_2eec005ba0f868c48de65676e7\` TO \`IDX_f76de6ed10d8423f5282f4e022\``);
        await queryRunner.query(`ALTER TABLE \`game\` RENAME INDEX \`IDX_f630fa049348abe2745e28f223\` TO \`IDX_7a3457cfa4a21186667d094da8\``);
        await queryRunner.query(`ALTER TABLE \`game\` RENAME INDEX \`IDX_91cb1ab8efdba2723ec6c21b43\` TO \`IDX_0ba44d40b3239783f505eeb25d\``);

        await queryRunner.query(`ALTER TABLE \`rating_games_game\` RENAME COLUMN \`gameId\` TO \`hostedGameId\``);
        await queryRunner.query(`ALTER TABLE \`game_to_player\` RENAME COLUMN \`gameId\` TO \`hostedGameId\``);
        await queryRunner.query(`ALTER TABLE \`tournament_match\` RENAME COLUMN \`gameId\` TO \`hostedGameId\``);
        await queryRunner.query(`ALTER TABLE \`player_notification\` RENAME COLUMN \`gameId\` TO \`hostedGameId\``);
        await queryRunner.query(`ALTER TABLE \`game_analyze\` RENAME COLUMN \`gameId\` TO \`hostedGameId\``);
        await queryRunner.query(`ALTER TABLE \`conditional_moves\` RENAME COLUMN \`gameId\` TO \`hostedGameId\``);
        await queryRunner.query(`ALTER TABLE \`chat_message\` RENAME COLUMN \`gameId\` TO \`hostedGameId\``);

        await queryRunner.query(`RENAME TABLE \`rating_games_game\` TO \`rating_games_hosted_game\``);
        await queryRunner.query(`RENAME TABLE \`game_to_player\` TO \`hosted_game_to_player\``);
        await queryRunner.query(`RENAME TABLE \`game\` TO \`hosted_game\``);

        await queryRunner.query(`ALTER TABLE \`hosted_game\` ADD CONSTRAINT \`FK_8485625a8b08f4e466a677c0ff1\` FOREIGN KEY (\`hostId\`) REFERENCES \`player\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`hosted_game\` ADD CONSTRAINT \`FK_9bf2411e82c38cfd8af4f4c6419\` FOREIGN KEY (\`rematchedFromId\`) REFERENCES \`hosted_game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`hosted_game\` ADD CONSTRAINT \`FK_b1e0077ad74acda2ff6850016db\` FOREIGN KEY (\`rematchId\`) REFERENCES \`hosted_game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`rating_games_hosted_game\` ADD CONSTRAINT \`FK_870f3e487e4342542fe7f959d27\` FOREIGN KEY (\`ratingId\`) REFERENCES \`rating\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`rating_games_hosted_game\` ADD CONSTRAINT \`FK_8a004a11c3f59b65cb9af2f58ea\` FOREIGN KEY (\`hostedGameId\`) REFERENCES \`hosted_game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`hosted_game_to_player\` ADD CONSTRAINT \`FK_a8b097c56ee69fdddf730e7cf78\` FOREIGN KEY (\`playerId\`) REFERENCES \`player\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`hosted_game_to_player\` ADD CONSTRAINT \`FK_fdf42b21f9f53fc1591693f3dab\` FOREIGN KEY (\`hostedGameId\`) REFERENCES \`hosted_game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`tournament_match\` ADD CONSTRAINT \`FK_c274da5202ba2bfed1b709bd91b\` FOREIGN KEY (\`hostedGameId\`) REFERENCES \`hosted_game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`player_notification\` ADD CONSTRAINT \`FK_a579029a5b14be3e6e13a8616ea\` FOREIGN KEY (\`hostedGameId\`) REFERENCES \`hosted_game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`game_analyze\` ADD CONSTRAINT \`FK_0b5fa1ca52d143efd83c509ae79\` FOREIGN KEY (\`hostedGameId\`) REFERENCES \`hosted_game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`conditional_moves\` ADD CONSTRAINT \`FK_59ba669f0f2f106699368e147cb\` FOREIGN KEY (\`hostedGameId\`) REFERENCES \`hosted_game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`chat_message\` ADD CONSTRAINT \`FK_c11c5541b19938027069b21ef66\` FOREIGN KEY (\`hostedGameId\`) REFERENCES \`hosted_game\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
