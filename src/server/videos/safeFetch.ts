import { lookup } from 'dns/promises';
import { BlockList, isIP } from 'net';

/**
 * When an external url cannot be fetched:
 * invalid url, not allowed host, network error, too large...
 */
export class SafeFetchError extends Error {}

/**
 * Prevent fetching urls of local network.
 */
const privateAddresses = new BlockList();

privateAddresses.addSubnet('0.0.0.0', 8);
privateAddresses.addSubnet('10.0.0.0', 8);
privateAddresses.addSubnet('100.64.0.0', 10);
privateAddresses.addSubnet('127.0.0.0', 8);
privateAddresses.addSubnet('169.254.0.0', 16);
privateAddresses.addSubnet('172.16.0.0', 12);
privateAddresses.addSubnet('192.168.0.0', 16);
privateAddresses.addAddress('::', 'ipv6');
privateAddresses.addAddress('::1', 'ipv6');
privateAddresses.addSubnet('fc00::', 7, 'ipv6');
privateAddresses.addSubnet('fe80::', 10, 'ipv6');

const isPublicHost = async (hostname: string): Promise<boolean> => {
    hostname = hostname.replace(/^\[|\]$/g, '');

    const addresses = isIP(hostname)
        ? [{ address: hostname, family: isIP(hostname) }]
        : await lookup(hostname, { all: true });

    return addresses.every(({ address, family }) => !privateAddresses.check(address, family === 6 ? 'ipv6' : 'ipv4'));
};

/**
 * @throws {SafeFetchError} If url is not http(s), or host is in local network
 */
const mustBePublicHttpUrl = async (url: string): Promise<URL> => {
    let parsed: URL;

    try {
        parsed = new URL(url);
    } catch {
        throw new SafeFetchError('Invalid url');
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new SafeFetchError('Url must be http or https');
    }

    let isPublic: boolean;

    try {
        isPublic = await isPublicHost(parsed.hostname);
    } catch {
        throw new SafeFetchError('Could not resolve host');
    }

    if (!isPublic) {
        throw new SafeFetchError('Url not allowed');
    }

    return parsed;
};

type SafeFetchOptions = {
    maxSize: number;
    timeout?: number;
    maxRedirects?: number;

    /**
     * Stop reading body once maxSize is reached instead of throwing,
     * i.e for html pages where only <head> is needed.
     */
    truncate?: boolean;
};

type SafeFetchResult = {
    status: number;
    mimeType: string;
    body: Buffer;
};

/**
 * Fetches an external url given by a player.
 * Prevents requesting local network (also checks redirects), and limits response size.
 *
 * @throws {SafeFetchError}
 */
export const safeFetch = async (url: string, { maxSize, timeout = 10000, maxRedirects = 3, truncate = false }: SafeFetchOptions): Promise<SafeFetchResult> => {
    let currentUrl = url;
    const signal = AbortSignal.timeout(timeout);

    for (let redirects = 0; ; ++redirects) {
        const parsed = await mustBePublicHttpUrl(currentUrl);
        let response: Response;

        try {
            response = await fetch(parsed, {
                redirect: 'manual',
                signal,
                headers: { 'Accept-Language': 'en' },
            });
        } catch {
            throw new SafeFetchError('Could not fetch url');
        }

        const location = response.headers.get('location');

        if (response.status >= 300 && response.status < 400 && location !== null) {
            await response.body?.cancel();

            if (redirects >= maxRedirects) {
                throw new SafeFetchError('Too many redirects');
            }

            currentUrl = new URL(location, parsed).toString();
            continue;
        }

        const chunks: Uint8Array[] = [];
        let size = 0;

        if (response.body) {
            for await (const chunk of response.body) {
                if (size + chunk.length > maxSize) {
                    if (!truncate) {
                        throw new SafeFetchError('Response too large');
                    }

                    chunks.push(chunk.subarray(0, maxSize - size));
                    break;
                }

                size += chunk.length;
                chunks.push(chunk);
            }
        }

        return {
            status: response.status,
            mimeType: (response.headers.get('content-type') ?? '').split(';')[0].trim(),
            body: Buffer.concat(chunks),
        };
    }
};
