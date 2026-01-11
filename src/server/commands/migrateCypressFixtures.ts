/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync, writeFileSync } from 'node:fs';
import { glob } from 'glob';
import hexProgram from './hexProgram.js';
import { coordsToMove } from '../../shared/move-notation/move-notation.js';

/**
 * How to change object in each file.
 *
 * @param before The actual fixture in file
 *
 * @returns Object after change
 */
const migrate = (before: any): any => {
    if (!Array.isArray(before.movesHistory)) {
        return before;
    }

    const moves = [];
    const moveTimestamps = [];

    for (const { row, col, specialMoveType, playedAt } of before.movesHistory) {
        if (specialMoveType) {
            moves.push(specialMoveType);
        } else {
            moves.push(coordsToMove({ row, col }));
        }

        moveTimestamps.push(playedAt);
    }

    const entries = Object.entries(before);
    const position = entries.findIndex(([key]) => key === 'movesHistory');
    entries.splice(position, 1, ['moves', moves], ['moveTimestamps', moveTimestamps]);

    return Object.fromEntries(entries);
};

const fixturesFolder = './cypress/fixtures';

hexProgram
    .command('migrate-cypress-fixtures')
    .description('When changes are applied to schema, modifies all cypress fixtures to reflect the change')
    .action(async () => {
        for (const jsonFilename of await glob(fixturesFolder + '/**/*.json')) {
            console.log('Migrate ' + jsonFilename + ' ...');
            const json = readFileSync(jsonFilename).toString();
            const data = JSON.parse(json);

            const after = migrate(data);

            writeFileSync(jsonFilename, JSON.stringify(after, undefined, 4) + '\n');
        }

        console.log('done');
    })
;

/*
 * Old migrations, for examples
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const migrateMergeGameIntoHostedGame = (before: any): any => {
    // Merge Game into HostedGame

    const merge = (object: any) => {
        if (!object.publicId || !object.host) {
            // not a hosted game
            return;
        }

        if (object.state === 'forfeited') {
            object.state = 'ended';
        }

        if (object.outcome === null && object.state === 'ended') {
            object.outcome = 'path';
        }
    };

    if (Array.isArray(before)) {
        for (const item of before) {
            merge(item);
        }
    } else if (typeof before === 'object') {
        merge(before);
    }

    return before;
};
