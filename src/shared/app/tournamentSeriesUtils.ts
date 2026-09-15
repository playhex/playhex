type TitlePatternParams = {
    /**
     * Instance number, i.e number of non-canceled tournaments in the series, plus one.
     */
    n: number;

    /**
     * Tournament start date, used for {month} and {year}.
     */
    date: Date;
};

/**
 * Replaces {n}, {n+8}, {n-2}, {month} and {year} in a series title pattern.
 * Unknown placeholders are left untouched.
 *
 * {n} accepts an offset, for series which did not start at 1,
 * e.g first instances of "Hex Monthly" happened before the series was created here:
 * "Hex Monthly {n+8}" makes the first instance created here be named "Hex Monthly 9".
 *
 * Month is forced in english: resolved title is persisted and used to generate slug,
 * it must not depend on the locale of the organizer browser.
 */
export const resolveSeriesTitlePattern = (pattern: string, params: TitlePatternParams): string => {
    return pattern.replace(/\{(?:n(?<offset>[+-]\d+)?|(?<name>month|year))\}/g, (placeholder, offset: undefined | string, name: undefined | string) => {
        switch (name) {
            case 'month': return new Intl.DateTimeFormat('en', { month: 'long' }).format(params.date);
            case 'year': return String(params.date.getFullYear());
            case undefined: return String(params.n + (offset ? parseInt(offset, 10) : 0));
            default: return placeholder;
        }
    });
};

/**
 * Title of the next instance of a series.
 * Falls back to "<series title> <n>" when series has no title pattern.
 */
export const nextSeriesTitle = (
    tournamentSeries: { title: string, titlePattern: null | string },
    n: number,
    date: Date,
): string => {
    if (!tournamentSeries.titlePattern) {
        return `${tournamentSeries.title} ${n}`;
    }

    return resolveSeriesTitlePattern(tournamentSeries.titlePattern, { n, date });
};
