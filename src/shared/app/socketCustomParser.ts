/* eslint-disable @typescript-eslint/no-explicit-any */
import { Encoder as BaseEncoder, Decoder as BaseDecoder, Packet, PacketType } from 'socket.io-parser';
import { denormalize, normalize } from './serializer';

interface SerializablePacket extends Packet
{
    type: PacketType.EVENT | PacketType.ACK;
    data: any[];
}

const shouldTransformPacket = (packet: Packet): packet is SerializablePacket => {
    return (
        packet.type === PacketType.EVENT ||
        packet.type === PacketType.ACK
    ) && Array.isArray(packet.data);
}

export class Encoder extends BaseEncoder
{
    override encode(obj: Packet): any[] {
        if (shouldTransformPacket(obj)) {
            obj.data = obj.data.map(arg => normalize(arg));
        }

        return super.encode(obj);
    }
}

export class Decoder extends BaseDecoder
{
    private baseDecoder = new BaseDecoder();

    constructor()
    {
        super();

        this.baseDecoder.on('decoded', packet => {
            if (shouldTransformPacket(packet)) {
                packet.data = packet.data.map(arg => denormalize(arg));
            }

            super.emitReserved('decoded', packet);
        });
    }

    override add(obj: any): void
    {
        this.baseDecoder.add(obj);
    }
}
