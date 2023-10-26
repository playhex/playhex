import { Encoder as BaseEncoder, Decoder as BaseDecoder } from 'socket.io-parser';
import SuperJSON from "superjson";

export class Encoder extends BaseEncoder
{
    constructor()
    {
        super((key, value) => {
            if (!('' === key && Array.isArray(value))) {
                return value;
            }

            return value.map((v, index) => {
                if (0 === index) {
                    return v;
                }

                if (null !== v && 'object' === typeof v) {
                    return SuperJSON.serialize(v);
                }

                return v;
            });
        });
    }
}

export class Decoder extends BaseDecoder
{
    constructor()
    {
        super((key, value) => {
            if (!('' === key && Array.isArray(value))) {
                return value;
            }

            return value.map((v, index) => {
                if (0 === index) {
                    return v;
                }

                if ('object' === typeof v && v.json) {
                    return SuperJSON.deserialize(v);
                }

                return v;
            });
        });
    }
}
