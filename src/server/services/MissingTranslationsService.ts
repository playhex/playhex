/**
 * Finds keys missing in a translation file compared to a source translation file,
 * and builds a prompt to have them translated.
 *
 * Works with nested json translation files using i18next plural suffixes
 * (key_one, key_other, key_ordinal_one...): plural keys are not copied from source as is,
 * one key is created for each plural category of the target locale.
 */

export type TranslationObject = { [key: string]: string | TranslationObject };

const PLURAL_SUFFIX = /^(.+)_(zero|one|two|few|many|other)$/;
const ORDINAL_SUFFIX = '_ordinal';

const CATEGORIES_ORDER: Intl.LDMLPluralRule[] = ['zero', 'one', 'two', 'few', 'many', 'other'];

const INTEGER_SAMPLES = [...Array(1001).keys(), 1000000, 2000000];
const DECIMAL_SAMPLES = [0.5, 1.5, 2.5];

export type MissingTranslationsOptions = {
    /**
     * Do not generate plural categories only used for decimal numbers,
     * like "many" in Czech or "other" in Polish and Russian.
     * Weblate plural formulas only handle integers, and removes these categories.
     */
    ignoreDecimalPlurals?: boolean;
};

const isObject = (value: unknown): value is TranslationObject =>
    typeof value === 'object' && value !== null
;

export default class MissingTranslationsService
{
    constructor(
        /** Locale of the source translation file, e.g "en" */
        private sourceLocale: string,
        private options: MissingTranslationsOptions = {},
    ) {}

    /**
     * Integer samples selecting each plural category, cached by locale and type,
     * because selecting all samples is done for each plural key.
     */
    private integerSamplesCache = new Map<string, Map<Intl.LDMLPluralRule, number[]>>();

    private getIntegerSamples(locale: string, ordinal: boolean): Map<Intl.LDMLPluralRule, number[]>
    {
        const cacheKey = `${locale}|${ordinal}`;
        let samples = this.integerSamplesCache.get(cacheKey);

        if (samples === undefined) {
            const pluralRules = new Intl.PluralRules(locale, { type: ordinal ? 'ordinal' : 'cardinal' });
            samples = new Map();

            for (const n of INTEGER_SAMPLES) {
                const category = pluralRules.select(n);
                const categorySamples = samples.get(category) ?? [];

                categorySamples.push(n);
                samples.set(category, categorySamples);
            }

            this.integerSamplesCache.set(cacheKey, samples);
        }

        return samples;
    }

    getPluralCategories(locale: string, ordinal = false): Intl.LDMLPluralRule[]
    {
        const categories = this.options.ignoreDecimalPlurals
            ? [...this.getIntegerSamples(locale, ordinal).keys()]
            : new Intl.PluralRules(locale, { type: ordinal ? 'ordinal' : 'cardinal' }).resolvedOptions().pluralCategories
        ;

        return CATEGORIES_ORDER.filter(category => categories.includes(category));
    }

    /**
     * Returns keys from source that are missing in target.
     * For plural keys, returns all plural forms of target locale missing in target,
     * with source text of same plural category, or source "other" form if source locale has not this category.
     */
    getMissingKeys(source: TranslationObject, target: TranslationObject, targetLocale: string): TranslationObject
    {
        const missing: TranslationObject = {};
        const pluralBases = new Set<string>();

        for (const key of Object.keys(source)) {
            const match = key.match(PLURAL_SUFFIX);

            if (match !== null && typeof source[`${match[1]}_other`] === 'string') {
                pluralBases.add(match[1]);
                continue;
            }

            const sourceValue = source[key];
            const targetValue = target[key];

            if (isObject(sourceValue)) {
                const nestedMissing = this.getMissingKeys(
                    sourceValue,
                    isObject(targetValue) ? targetValue : {},
                    targetLocale,
                );

                if (Object.keys(nestedMissing).length > 0) {
                    missing[key] = nestedMissing;
                }
            } else if (targetValue === undefined) {
                missing[key] = sourceValue;
            }
        }

        for (const base of pluralBases) {
            const ordinal = base.endsWith(ORDINAL_SUFFIX);

            for (const category of this.getPluralCategories(targetLocale, ordinal)) {
                const key = `${base}_${category}`;

                if (target[key] === undefined) {
                    missing[key] = source[key] ?? source[`${base}_other`];
                }
            }
        }

        return missing;
    }

    /**
     * Merges translated keys into target, translated keys overriding target ones.
     */
    deepMerge(target: TranslationObject, patch: TranslationObject): TranslationObject
    {
        const result: TranslationObject = { ...target };

        for (const key of Object.keys(patch)) {
            const patchValue = patch[key];
            const targetValue = target[key];

            result[key] = isObject(patchValue) && isObject(targetValue)
                ? this.deepMerge(targetValue, patchValue)
                : patchValue
            ;
        }

        return result;
    }

    /**
     * Describes which numbers select each plural category of a locale,
     * e.g "few: 2, 3, 4, 22, 23, 24, …"
     */
    describePluralRules(locale: string, ordinal = false): string[]
    {
        const pluralRules = new Intl.PluralRules(locale, { type: ordinal ? 'ordinal' : 'cardinal' });
        const integerSamples = this.getIntegerSamples(locale, ordinal);

        return this.getPluralCategories(locale, ordinal).map(category => {
            const integerExamples = integerSamples.get(category) ?? [];
            const decimalExamples = DECIMAL_SAMPLES.filter(n => pluralRules.select(n) === category);

            const examples = integerExamples.length > 8
                ? [...integerExamples.slice(0, 8), '…']
                : integerExamples
            ;

            let description = `"${category}": ${examples.length > 0 ? examples.join(', ') : 'no integer'}`;

            if (decimalExamples.length > 0) {
                description += ` (and decimals like ${decimalExamples.join(', ')})`;
            }

            if (integerExamples.length === 0) {
                description += ', only used for decimals: still translate it';
            }

            return description;
        });
    }

    buildPrompt(missing: TranslationObject, targetLocale: string, languageName: string): string
    {
        const lines = [
            `Translate this json to ${languageName}. Keep keys and json structure as is, translate only values. Keep placeholders like {{count}} or {link} and html tags untouched.`,
        ];

        const missingKeys = this.flattenKeys(missing);
        const hasCardinal = missingKeys.some(key => PLURAL_SUFFIX.test(key) && !key.includes(`${ORDINAL_SUFFIX}_`));
        const hasOrdinal = missingKeys.some(key => PLURAL_SUFFIX.test(key) && key.includes(`${ORDINAL_SUFFIX}_`));

        if (hasCardinal || hasOrdinal) {
            const sourceLanguageName = new Intl.DisplayNames(['en'], { type: 'language' }).of(this.sourceLocale) ?? this.sourceLocale;
            const suffixes = [...new Set([
                ...(hasCardinal ? this.getPluralCategories(targetLocale) : []),
                ...(hasOrdinal ? this.getPluralCategories(targetLocale, true) : []),
            ])];

            lines.push(
                '',
                `Keys ending with ${suffixes.map(c => `_${c}`).join(', ')} are plural forms, chosen depending on the number ({{count}}).`,
                `Their value is the ${sourceLanguageName} text, which may not have the same plural forms: when ${sourceLanguageName} has no such form, its "other" form is given.`,
                `Translate each plural key according to ${languageName} grammar for these numbers:`,
            );
        }

        if (hasCardinal) {
            lines.push(...this.describePluralRules(targetLocale).map(line => `- ${line}`));
        }

        if (hasOrdinal) {
            lines.push(
                'For ordinal keys (_ordinal_*), these numbers:',
                ...this.describePluralRules(targetLocale, true).map(line => `- ${line}`),
            );
        }

        lines.push('', JSON.stringify(missing, null, 4));

        return lines.join('\n');
    }

    private flattenKeys(object: TranslationObject): string[]
    {
        return Object.entries(object).flatMap(([key, value]) => isObject(value)
            ? this.flattenKeys(value)
            : [key],
        );
    }
}
