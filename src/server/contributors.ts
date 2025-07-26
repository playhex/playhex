import type { GithubContributor, WeblateContributors } from '../shared/app/Types.js';
import { availableLocales } from '../shared/app/i18n/availableLocales.js';

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

const fetchWeblateContributors = async (): Promise<WeblateContributors> => {
    return cachedWeblateContributors;
};

export { fetchWeblateContributors };
