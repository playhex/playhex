import { validate } from 'class-validator';
import { HostedGameOptions, HostedGameOptionsTimeControlFischer } from '../models/index.js';
import assert from 'assert';

describe('HostedGameOptions', () => {
    it('validate ranked', async () => {
        const options = new HostedGameOptions();

        options.boardsize = 11;
        options.firstPlayer = null;
        options.swapRule = true;

        options.timeControl = new HostedGameOptionsTimeControlFischer();
        options.timeControl.type = 'fischer';
        options.timeControl.options = {
            initialTime: 600000,
            maxTime: 600000,
            timeIncrement: 5000,
        };

        options.ranked = true;

        const errors = await validate(options);

        assert.strictEqual(errors.length, 0);
    });

    it('not validate ranked with boardsize = 9', async () => {
        const options = new HostedGameOptions();

        options.boardsize = 9;
        options.firstPlayer = null;
        options.swapRule = true;

        options.timeControl = new HostedGameOptionsTimeControlFischer();
        options.timeControl.type = 'fischer';
        options.timeControl.options = {
            initialTime: 600000,
            maxTime: 600000,
            timeIncrement: 5000,
        };

        options.ranked = true;

        const errors = await validate(options);

        assert.notStrictEqual(errors.length, 0);
    });

    it('not validate ranked when host wants to play first', async () => {
        const options = new HostedGameOptions();

        options.boardsize = 14;
        options.firstPlayer = 0;
        options.swapRule = true;

        options.timeControl = new HostedGameOptionsTimeControlFischer();
        options.timeControl.type = 'fischer';
        options.timeControl.options = {
            initialTime: 600000,
            maxTime: 600000,
            timeIncrement: 5000,
        };

        options.ranked = true;

        const errors = await validate(options);

        assert.notStrictEqual(errors.length, 0);
    });

    it('not validate ranked with swap rule disabled', async () => {
        const options = new HostedGameOptions();

        options.boardsize = 19;
        options.firstPlayer = null;
        options.swapRule = false;

        options.timeControl = new HostedGameOptionsTimeControlFischer();
        options.timeControl.type = 'fischer';
        options.timeControl.options = {
            initialTime: 600000,
            maxTime: 600000,
            timeIncrement: 5000,
        };

        options.ranked = true;

        const errors = await validate(options);

        assert.notStrictEqual(errors.length, 0);
    });
});
