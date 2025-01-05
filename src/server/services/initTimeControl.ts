import { defaultCreateOptions } from '../../shared/time-control/createTimeControl';

export const initTimeControl = () => {
    const { GAME_CLOCK_SYSTEM_MAX_TIME } = process.env;

    if (GAME_CLOCK_SYSTEM_MAX_TIME) {
        defaultCreateOptions.systemMaxTime = parseInt(GAME_CLOCK_SYSTEM_MAX_TIME, 10);
    }
};
