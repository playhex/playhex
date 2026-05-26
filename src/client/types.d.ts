// Since typescript 6, I need this to import .css files to have eslint happy

declare module '*.styl';
declare module '*.scss';
declare module '*.css';

// Globals injected by Vite's define
declare const BASE_URL: string | undefined;
declare const SITE_TITLE_SUFFIX: string | undefined;
declare const PUSH_VAPID_PUBLIC_KEY: string | undefined;
declare const ALLOW_RANKED_BOT_GAMES: string | undefined;
declare const MATOMO_WEBSITE_ID: string | undefined;
declare const MATOMO_SRC: string | undefined;
declare const LAST_COMMIT_DATE: string;
declare const VERSION: string;
