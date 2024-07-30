import type { GithubContributor, WeblateContributors } from '../shared/app/Types';

const { FETCH_CONTRIBUTORS } = process.env;

let cachedGithubContributors: null | GithubContributor[] = null;

const fetchGithubContributors = async (): Promise<GithubContributor[]> => {
    if (null !== cachedGithubContributors) {
        return cachedGithubContributors;
    }

    if ('true' !== FETCH_CONTRIBUTORS) {
        return [];
    }

    const response = await fetch('https://api.github.com/repos/alcalyn/hex/contributors?per_page=100');
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

let cachedWeblateContributors: null | WeblateContributors = null;

const fetchWeblateContributors = async (): Promise<WeblateContributors> => {
    if (null !== cachedWeblateContributors) {
        return cachedWeblateContributors;
    }

    // Not yet exposed in API, see https://github.com/WeblateOrg/weblate/issues/5459
    // So copy report from https://hosted.weblate.org/projects/playhex/#reports (left menu, JSON).
    // For now, return hard coded until there is a new translator.

    // Check disabled because for now, not actually fetching external data
    // if ('true' !== FETCH_CONTRIBUTORS) {
    //     return {};
    // }

    return cachedWeblateContributors = {
        French: [
            { fullName: 'Julien Maulny' },
        ],
        German: [
            { fullName: 'Ettore Atalan' },
        ],
    };
};

export { fetchWeblateContributors };
