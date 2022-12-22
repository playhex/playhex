let playerId = localStorage.getItem('hex-player-id');

if (null === playerId) {
    playerId = crypto.randomUUID();
    localStorage.setItem('hex-player-id', playerId);
}

export default playerId;
