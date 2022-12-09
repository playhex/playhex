import { io } from 'socket.io-client';
import userId from './userId';

const socket = io({
    auth: {
        userId,
    },
});

export default socket;
