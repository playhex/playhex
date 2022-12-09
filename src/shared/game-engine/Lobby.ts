import LobbySlotInterface from './LobbySlotInterface';

export default class Lobby<T>
{
    public constructor(
        private lobbySlots: LobbySlotInterface<T>[],
    ) {}

    public playerJoin(connection: T): boolean
    {
        const freeSlot = this.lobbySlots.find(lobbySlot => lobbySlot.accepts(connection));

        if (undefined === freeSlot) {
            return false;
        }

        freeSlot.playerJoin(connection);

        return true;
    }
}
