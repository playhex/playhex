import type { GithubContributor, LiberapayPatron, WeblateContributors } from '../shared/app/Types.js';
import { availableLocales } from '../shared/app/i18n/availableLocales.js';
import { parse } from 'csv-parse/sync';
import logger from './services/logger.js';

const { FETCH_CONTRIBUTORS } = process.env;

let cachedGithubContributors: null | GithubContributor[] = null;

const fetchGithubContributors = async (): Promise<GithubContributor[]> => {
    if (cachedGithubContributors !== null) {
        return cachedGithubContributors;
    }

    if (FETCH_CONTRIBUTORS !== 'true') {
        return [];
    }

    const response = await fetch('https://api.github.com/repos/playhex/playhex/contributors?per_page=100');
    const results = await response.json();

    type GithubResult = {
        login: string;
        html_url: string;
        avatar_url: string;
    };

    return cachedGithubContributors = results.map((result: GithubResult) => ({
        username: result.login,
        link: result.html_url,
        avatarUrl: result.avatar_url,
    }));
};

export { fetchGithubContributors };

const cachedWeblateContributors: WeblateContributors = {};

for (const locale in availableLocales) {
    const { translators, label } = availableLocales[locale];

    if (translators && translators.length > 0) {
        cachedWeblateContributors[label] = translators;
    }
}

const fetchWeblateContributors = (): WeblateContributors => {
    return cachedWeblateContributors;
};

export { fetchWeblateContributors };

let cachedLiberapayPatrons: null | LiberapayPatron[] = null;
let liberapayCacheTime: number = 0;
const LIBERAPAY_CACHE_TTL = 3600 * 1000; // 1 hour

type LiberapayPatronAPI = {
    patron_username: string;

    /**
     * Can be an empty array
     */
    patron_public_name: string;

    /**
     * Can be an emtpy array
     */
    patron_avatar_url: string;
};

const fetchLiberapayPatrons = async (): Promise<LiberapayPatron[]> => {
    if (cachedLiberapayPatrons !== null && Date.now() - liberapayCacheTime < LIBERAPAY_CACHE_TTL) {
        return cachedLiberapayPatrons;
    }

    if (FETCH_CONTRIBUTORS !== 'true') {
        return [];
    }

    let response: Response;

    try {
        response = await fetch('https://liberapay.com/PlayHex/patrons/public.csv');
    } catch (e) {
        logger.error('Could not fetch Liberapay patrons', {
            error: e.message ?? e,
        });

        return cachedLiberapayPatrons ?? [];
    }

    /**
     * Example with headers:
     * ``` csv
     * pledge_date,patron_id,patron_username,patron_public_name,donation_currency,weekly_amount,patron_avatar_url
     * 2025-10-07,1895934,mason,Mason,CAD,1.15,
     * 2025-10-08,1895950,bobson,bobson,EUR,0.25,https://seccdn.libravatar.org/avatar/c5b51f5b947086b44fa6450c95802275?s=160&d=404&=1
     * ```
     */
    const text = await response.text();

    const parsed: LiberapayPatronAPI[] = parse(text, {
        columns: true,
        skip_empty_lines: true,
    });

    cachedLiberapayPatrons = parsed.map(patronAPI => {
        return {
            username: patronAPI.patron_username,
            publicName: patronAPI.patron_public_name || undefined,
            avatar: patronAPI.patron_avatar_url || undefined,
        };
    });

    liberapayCacheTime = Date.now();

    return cachedLiberapayPatrons;
};

export { fetchLiberapayPatrons };
