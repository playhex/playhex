import { io } from 'socket.io-client';
import playerId from './playerId';

const socket = io({
    auth: {
        playerId,
    },
});

export default socket;
