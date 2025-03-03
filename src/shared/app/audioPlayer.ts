const audioSingletons: { [filename: string]: HTMLAudioElement } = {};

const getAudioSingleton = (filename: string): HTMLAudioElement => {
    if (!audioSingletons[filename]) {
        audioSingletons[filename] = new Audio(filename);
    }

    return audioSingletons[filename];
};

export const playAudio = async (filename: string): Promise<void> => {
    try {
        const audio = getAudioSingleton(filename);
        await audio.play();
    } catch (e) {
        // noop, browser says user has not allowed audio permission
    }
};
