export default interface LobbySlotInterface<T>
{
    accepts(connection: T): boolean;
    playerJoin(connection: T): void;
}
