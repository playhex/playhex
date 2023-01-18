import 'express-session';
import { Session } from 'express-session';

declare module 'express-session' {
    interface SessionData {
        playerId: string;
    }
}

declare module 'http' {
    interface IncomingMessage {
        cookieHolder?: string;
        session: Session & {
            playerId: string;
        }
    }
}
