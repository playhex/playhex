import { MigrationInterface, QueryRunner } from "typeorm";

export class PlayerAccountPassword1780351319361 implements MigrationInterface {
    name = 'PlayerAccountPassword1780351319361'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE player_account_password (
                playerId int NOT NULL,
                login varchar(34) NOT NULL,
                password char(60) NULL,
                createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE INDEX IDX_7a2ea952f952489a3e27a75b23 (login),
                PRIMARY KEY (playerId)
            ) ENGINE=InnoDB
        `);


        await queryRunner.query(`
            insert into player_account_password
            (
                playerId,
                login,
                password,
                createdAt,
                updatedAt
            )
            select
                id,
                pseudo,
                password,
                registeredAt,
                registeredAt
            from player
            where not isGuest
            and not isBot
            and not pseudo like 'anonymous%'
        `);

        await queryRunner.query(`ALTER TABLE player_account_password ADD CONSTRAINT FK_a505fcac3777a675524d636679e FOREIGN KEY (playerId) REFERENCES player(id) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE player DROP COLUMN password`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE player_account_password DROP FOREIGN KEY FK_a505fcac3777a675524d636679e`);
        await queryRunner.query(`ALTER TABLE player ADD password char(60) COLLATE "utf8mb4_unicode_ci" NULL`);
        await queryRunner.query(`
            UPDATE player p
            JOIN player_account_password pap ON pap.playerId = p.id
            SET p.password = pap.password
        `);
        await queryRunner.query(`DROP INDEX IDX_7a2ea952f952489a3e27a75b23 ON player_account_password`);
        await queryRunner.query(`DROP TABLE player_account_password`);
    }

}
