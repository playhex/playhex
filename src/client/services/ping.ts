import useSocketStore from '../stores/socketStore';

export const answerPing = () => {
    useSocketStore().socket.on('ping', answer => answer(new Date().toISOString()));
};
