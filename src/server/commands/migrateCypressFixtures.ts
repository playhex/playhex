/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync, writeFileSync } from 'node:fs';
import { glob } from 'glob';
import hexProgram from './hexProgram.js';

/**
 * How to change object in each file.
 *
 * @param before The actual fixture in file
 *
 * @returns Object after change
 */
const migrate = (before: any): any => {
    // Merge Game into HostedGame

    const merge = (object: any) => {
        if (!object.publicId || !object.host) {
            // not a hosted game
            return;
        }

        if (typeof object.winner !== 'undefined') {
            // already migrated
            return;
        }

        if (object.gameData) {
            object.movesHistory = object.gameData.movesHistory ?? [];
            object.currentPlayerIndex = object.gameData.currentPlayerIndex;
            object.winner = object.gameData.winner;
            object.outcome = object.gameData.outcome;
            object.startedAt = object.gameData.startedAt;
            object.lastMoveAt = object.gameData.lastMoveAt;
            object.endedAt = object.gameData.endedAt;
        } else {
            object.movesHistory = [];
            object.currentPlayerIndex = 0;
            object.winner = null;
            object.outcome = null;
            object.startedAt = null;
            object.lastMoveAt = null;
            object.endedAt = null;
        }

        // always delete, even when gameData is null
        delete object.gameData;
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
