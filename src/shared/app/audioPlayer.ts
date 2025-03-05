const getAudio = (filename: string): HTMLAudioElement => {
    // must recreate new audio every time to prevent audio not playing because not finished last play
    // e.g Move played too fast
    return new Audio(filename);
};

export const playAudio = async (filename: string): Promise<void> => {
    try {
        const audio = getAudio(filename);
        await audio.play();
    } catch (e) {
        // noop, browser says user has not allowed audio permission
    }
};
