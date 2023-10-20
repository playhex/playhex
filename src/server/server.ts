import { HexClientToServerEvents, HexServerToClientEvents } from "@shared/app/HexSocketEvents";
import { Server, Socket } from "socket.io";
import { Service } from "typedi";

@Service()
export class HexServer extends Server<HexClientToServerEvents, HexServerToClientEvents> {}

export type HexSocket = Socket<HexClientToServerEvents, HexServerToClientEvents>;
