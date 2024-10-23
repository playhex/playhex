import { EventEmitter } from 'events';

class SocketIoMock extends EventEmitter
{
    connect()
    {
        this.emit('connect');
        return this;
    }

    disconnect()
    {
        this.emit('disconnect');
        return this;
    }
}

export const socketIoMock = new SocketIoMock();
