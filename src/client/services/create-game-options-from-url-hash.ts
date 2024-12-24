import { HostedGameOptions } from '../../shared/app/models';

export const createGameOptionsFromUrlHash = (hash: string = document.location.hash): null | HostedGameOptions => {
    if (!hash || !hash.startsWith('#create-')) {
        return null;
    }

    const gameOptions: HostedGameOptions = new HostedGameOptions();

    // Allow writing "#create-hex-monthly" in hash instead of "#create-hexmonthly"
    hash = hash.replace('hex-monthly', 'hexmonthly');

    for (const parameter of hash.split('-')) {
        let match;

        // Parse boardsize, i.e "11x11"
        if ((match = parameter.match(/^(\d+)x(\d+)$/))) {
            if (match[1] !== match[2]) {
                // eslint-disable-next-line no-console
                console.warn(`Create game from url hash: parameter "${parameter}": rectangular board not supported. Using first value.`);
            }

            gameOptions.boardsize = parseInt(match[1], 10);
            continue;
        }

        // Parse fischer time control, i.e "10+5", supports only minutes + seconds
        if ((match = parameter.match(/^(\d+)\+(\d+)$/))) {
            gameOptions.timeControl = {
                type: 'fischer',
                options: {
                    initialTime: parseInt(match[1], 10) * 60000,
                    timeIncrement: parseInt(match[2], 10) * 1000,
                },
            };

            if (hash.includes('capped')) {
                gameOptions.timeControl.options.maxTime = gameOptions.timeControl.options.initialTime;
            }

            continue;
        }

        switch (parameter) {
            case '#create':
            case '':
                break;

            case '1v1':
                gameOptions.opponentType = 'player';
                break;

            case '1vAI':
                gameOptions.opponentType = 'ai';
                break;

            case 'ranked':
                gameOptions.ranked = true;
                break;

            case 'friendly':
                gameOptions.ranked = false;
                break;

            case 'hexmonthly':
                gameOptions.boardsize = 14;
                gameOptions.ranked = true;
                gameOptions.timeControl = {
                    type: 'fischer',
                    options: {
                        initialTime: 300000,
                        timeIncrement: 30000,
                        maxTime: 300000,
                    },
                };
                break;

            case 'noswap':
                gameOptions.swapRule = false;
                break;

            case 'hostfirst':
                gameOptions.firstPlayer = 0;
                break;

            case 'hostsecond':
                gameOptions.firstPlayer = 1;
                break;

            default:
                // eslint-disable-next-line no-console
                console.warn(`Create game from url hash: Unknown parameter "${parameter}", ignoring`);
        }
    }

    return gameOptions;
};
