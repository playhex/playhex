import { SuperJSON } from 'superjson';

export const serialize = (data: unknown): string => {
    if ('object' === typeof data && null !== data) {
        return SuperJSON.stringify(data);
    }

    return JSON.stringify(data);
};

export const deserialize = <T>(serial: string): T => {
    try {
        const parsed = JSON.parse(serial);

        if (parsed.json) {
            return SuperJSON.deserialize(parsed);
        }

        return parsed;
    } catch (e) {
        throw new Error(`json parse error: "${serial}". Error: ${e}`);
    }
};
