const getAudio = (filename: string): HTMLAudioElement => {
    // must recreate new audio every time to prevent audio not playing because not finished last play
    // e.g Move played too fast
    return new Audio(filename);
};

// Play audio file unless mute is enabled in local settings
// Optionally override mute check with second parameter
export const playAudio = (filename: string, mute_override = false): void => {
    // TODO: This is not the correct way to access local storage settings.
    if (JSON.parse(localStorage?.getItem('hex-local-settings') || '').muteAudio 
        && !mute_override){return};

    const audio = getAudio(filename);

    audio.play().catch(() => {
        // noop, browser says user has not allowed audio permission
    });
};
