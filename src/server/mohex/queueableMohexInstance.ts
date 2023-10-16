import Mohex from '../mohex-cli/Mohex';
import QueueableMohex from '../mohex-cli/QueueableMohex';

const { MOHEX_BINARY } = process.env;

export const isMohexEnabled = (): boolean => !!MOHEX_BINARY;

export const getMohexInstance = (): QueueableMohex => {
    if (!isMohexEnabled()) {
        throw new Error('Cannot use mohex module, please define a MOHEX_BINARY="..." in env');
    }

    if (!MOHEX_BINARY) {
        throw new Error('Expected MOHEX_BINARY here');
    }

    const mohexSeed = 1;
    const queueableMohex = new QueueableMohex(new Mohex(MOHEX_BINARY, mohexSeed));

    queueableMohex.queueCommand(async (mohex) => {
        await mohex.setMohexParameters({
            reuse_subtree: false,
            max_time: '10',
            max_games: '20', // limit mohex power
            max_memory: '' + (512 * 1024 * 1024), // 512Mio
        });

        await mohex.setGameParameters({
            allow_swap: false,
        });

        await mohex.sendCommand('benzene-license');
    }).then(() => {
        console.log('mohex preconfigured.');
    });

    return queueableMohex;
};
