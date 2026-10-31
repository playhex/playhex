import 'express-session';
import { Session } from 'express-session';

export type DiscordOAuthIntent = 'login' | 'link';

/**
 * Pending "log in with Discord", to check state on callback.
 */
export type DiscordOAuthPending = {
    state: string;
    intent: DiscordOAuthIntent;
    redirect?: string;
};

declare module 'express-session' {
    interface SessionData {
        playerId?: string;
        discordOAuth?: DiscordOAuthPending;
    }
}

declare module 'http' {
    interface IncomingMessage {
        cookieHolder?: string;
        session: Session & {
            playerId?: string;
            discordOAuth?: DiscordOAuthPending;
        };
    }
}
