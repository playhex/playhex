import { v4 as uuidv4 } from 'uuid';

let playerId = localStorage.getItem('hex-player-id');

if (null === playerId) {
    playerId = uuidv4();
    localStorage.setItem('hex-player-id', playerId);
}

export default playerId;
