import assert from 'assert';
import { describe, it } from 'mocha';
import { validate } from 'class-validator';
import PlayerIdentityMap from '../../identity-map/PlayerIdentityMap.js';
import PlayerPronounsController, { UpdatePronounsBody } from '../../controllers/http/api/PlayerPronounsController.js';
import PlayerRepository from '../../repositories/PlayerRepository.js';
import { Player } from '../../../shared/app/models/index.js';
import { playerPronouns } from '../../../shared/app/playerPronouns.js';

// Exercise the same body validation and authorization used by routing-controllers.
describe('PlayerPronounsController', () => {
    it('accepts only supported pronouns or explicit null, including when clearing', async () => {
        for (const pronouns of [...playerPronouns, null]) {
            assert.deepStrictEqual(await validate(Object.assign(new UpdatePronounsBody(), { pronouns })), []);
        }
        for (const pronouns of [undefined, '', 'other', 'HE/HIM', 1, {}, ['he/him']]) {
            assert.notStrictEqual((await validate(Object.assign(new UpdatePronounsBody(), { pronouns }))).length, 0);
        }
    });

    it('updates storage and the instance already held by active games, including clearing', async () => {
        const identityMap = new PlayerIdentityMap();
        const player = Object.assign(new Player(), { publicId: 'owner' });
        identityMap.resolve(player);
        const writes: unknown[] = [];
        const query = {
            update: () => query,
            where: (sql: string, parameters: unknown) => {
                assert.strictEqual(sql, 'publicId = :publicId');
                assert.deepStrictEqual(parameters, { publicId: 'owner' });
                return query;
            },
            set: (values: unknown) => { writes.push(values); return query; },
            execute: () => Promise.resolve(),
        };
        type Dependencies = ConstructorParameters<typeof PlayerRepository>;
        const repository = new PlayerRepository(
            { createQueryBuilder: () => query } as unknown as Dependencies[0],
            {} as Dependencies[1],
            {} as Dependencies[2],
            identityMap,
        );
        await repository.updatePronouns('owner', 'they/them');
        assert.strictEqual(player.pronouns, 'they/them');
        await repository.updatePronouns('owner', null);
        assert.strictEqual(player.pronouns, null);
        assert.deepStrictEqual(writes, [{ pronouns: 'they/them' }, { pronouns: null }]);
    });

    it('persists the owner choice and refuses guests or editing another account', async () => {
        const updates: unknown[][] = [];
        const repository = { updatePronouns: (...args: unknown[]) => { updates.push(args); return Promise.resolve(); } } as unknown as PlayerRepository;
        const controller = new PlayerPronounsController(repository);
        const player = Object.assign(new Player(), { publicId: 'owner', isGuest: false });
        for (const pronouns of ['she/her', null] as const) {
            assert.deepStrictEqual(await controller.updatePronouns(player, 'owner', { pronouns }), { pronouns });
        }
        await assert.rejects(controller.updatePronouns(player, 'other', { pronouns: 'he/him' }), { httpCode: 403 });
        player.isGuest = true;
        await assert.rejects(controller.updatePronouns(player, 'owner', { pronouns: 'he/him' }), { httpCode: 403 });
        assert.deepStrictEqual(updates, [['owner', 'she/her'], ['owner', null]]);
    });
});
