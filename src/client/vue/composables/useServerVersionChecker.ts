import { computed, ref } from 'vue';
import useSocketStore from '../../stores/socketStore.js';
import { apiGetServerInfo } from '../../apiClient.js';

export const useServerVersionChecker = () => {
    const { socket } = useSocketStore();

    /**
     * Current client javascript version.
     * Defined statically at build time (see webpack config).
     */
    /* global VERSION */
    // @ts-ignore: VERSION replaced at build time by webpack.
    const clientVersion: string = VERSION;

    /**
     * Current server version.
     * Defined by API.
     * Should be same as client version.
     * null: server version not yet fetched
     */
    const serverVersion = ref<null | string>(null);

    const checkServerVersion = async (): Promise<string> => {
        return serverVersion.value = (await apiGetServerInfo()).version;
    };

    socket.on('connect', async () => {
        await checkServerVersion();
    });

    checkServerVersion().catch(e => {
        throw new Error('Error while initially fetching server version: ' + e);
    });

    /**
     * Whether server and client versions are not same.
     * Should refresh.
     * null: server version not yet fetched
     */
    const clientUpToDate = computed<null | boolean>(() => {
        if (serverVersion.value === null) {
            return null;
        }

        return clientVersion === serverVersion.value;
    });

    const tryUpdateClient = (): void => {
        window.location.reload();
    };

    return {
        clientVersion,
        serverVersion,
        clientUpToDate,
        tryUpdateClient,
    };
};
