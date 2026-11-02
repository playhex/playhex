import assert from 'assert';
import { ImportUserError } from '../errors.js';
import { HexGameImporter } from '../HexGameImporter.js';
import { RawMoves } from '../handlers/RawMoves.js';
import { SGF } from '../handlers/SGF.js';

describe('HexGameImporter', () => {
    const importer = new HexGameImporter([new SGF(), new RawMoves()]);

    it('imports a game with a supported board size', async () => {
        const game = await importer.import('(;FF[4]SZ[11];B[a1];W[b2])');

        assert.strictEqual(game.boardsize, 11);
        assert.deepStrictEqual(game.moves, ['a1', 'b2']);
    });

    it('rejects a huge board size from SGF', async () => {
        await assert.rejects(
            importer.import('(;FF[4]SZ[100000];B[a1])'),
            (e: Error) => e instanceof ImportUserError && /Board size 100000 not supported/.test(e.message),
        );
    });

    it('rejects a huge board size guessed from raw moves', async () => {
        await assert.rejects(importer.import('a1 a99999'), ImportUserError);
    });
});
