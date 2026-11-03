import type { LandingContent, LandingFeatureKey } from './content/LandingContent.js';
import en from './content/en.js';
import fr from './content/fr.js';
import ar from './content/ar.js';
import bn from './content/bn.js';
import cs from './content/cs.js';
import da from './content/da.js';
import de from './content/de.js';
import es from './content/es.js';
import fi from './content/fi.js';
import hi from './content/hi.js';
import hu from './content/hu.js';
import id from './content/id.js';
import it from './content/it.js';
import ja from './content/ja.js';
import ko from './content/ko.js';
import mr from './content/mr.js';
import nl from './content/nl.js';
import pl from './content/pl.js';
import pt from './content/pt.js';
import ru from './content/ru.js';
import sv from './content/sv.js';
import ta from './content/ta.js';
import te from './content/te.js';
import tr from './content/tr.js';
import ur from './content/ur.js';
import zhHans from './content/zh-Hans.js';
import type { LandingIconName } from './landingIcons.js';

export type LandingLocale = {
    /**
     * BCP 47 tag, used in url "/{locale}/landing", in lang and hreflang.
     * Same as app locale, except "zh" (app locale is "zh-Hans").
     */
    locale: string;

    /**
     * og:locale, see https://ogp.me/#optional
     */
    ogLocale: string;

    /**
     * Native language name, shown in language selector.
     */
    label: string;

    dir: 'ltr' | 'rtl';

    content: LandingContent;
};

/**
 * Languages of the landing page, rendered server side, one url each.
 * First one is the default language (x-default).
 */
export const landingLocales: LandingLocale[] = [
    { locale: 'en', ogLocale: 'en_US', label: 'English', dir: 'ltr', content: en },
    { locale: 'fr', ogLocale: 'fr_FR', label: 'Français', dir: 'ltr', content: fr },
    { locale: 'ar', ogLocale: 'ar_AR', label: 'العربية', dir: 'rtl', content: ar },
    { locale: 'bn', ogLocale: 'bn_BD', label: 'বাংলা', dir: 'ltr', content: bn },
    { locale: 'cs', ogLocale: 'cs_CZ', label: 'Čeština', dir: 'ltr', content: cs },
    { locale: 'da', ogLocale: 'da_DK', label: 'Dansk', dir: 'ltr', content: da },
    { locale: 'de', ogLocale: 'de_DE', label: 'Deutsch', dir: 'ltr', content: de },
    { locale: 'es', ogLocale: 'es_ES', label: 'Español', dir: 'ltr', content: es },
    { locale: 'fi', ogLocale: 'fi_FI', label: 'Suomi', dir: 'ltr', content: fi },
    { locale: 'hi', ogLocale: 'hi_IN', label: 'हिन्दी', dir: 'ltr', content: hi },
    { locale: 'hu', ogLocale: 'hu_HU', label: 'Magyar', dir: 'ltr', content: hu },
    { locale: 'id', ogLocale: 'id_ID', label: 'Bahasa Indonesia', dir: 'ltr', content: id },
    { locale: 'it', ogLocale: 'it_IT', label: 'Italiano', dir: 'ltr', content: it },
    { locale: 'ja', ogLocale: 'ja_JP', label: '日本語', dir: 'ltr', content: ja },
    { locale: 'ko', ogLocale: 'ko_KR', label: '한국어', dir: 'ltr', content: ko },
    { locale: 'mr', ogLocale: 'mr_IN', label: 'मराठी', dir: 'ltr', content: mr },
    { locale: 'nl', ogLocale: 'nl_NL', label: 'Nederlands', dir: 'ltr', content: nl },
    { locale: 'pl', ogLocale: 'pl_PL', label: 'Polski', dir: 'ltr', content: pl },
    { locale: 'pt', ogLocale: 'pt_BR', label: 'Português', dir: 'ltr', content: pt },
    { locale: 'ru', ogLocale: 'ru_RU', label: 'Русский', dir: 'ltr', content: ru },
    { locale: 'sv', ogLocale: 'sv_SE', label: 'Svenska', dir: 'ltr', content: sv },
    { locale: 'ta', ogLocale: 'ta_IN', label: 'தமிழ்', dir: 'ltr', content: ta },
    { locale: 'te', ogLocale: 'te_IN', label: 'తెలుగు', dir: 'ltr', content: te },
    { locale: 'tr', ogLocale: 'tr_TR', label: 'Türkçe', dir: 'ltr', content: tr },
    { locale: 'ur', ogLocale: 'ur_PK', label: 'اردو', dir: 'rtl', content: ur },
    { locale: 'zh', ogLocale: 'zh_CN', label: '简体中文', dir: 'ltr', content: zhHans },
];

export const defaultLandingLocale = landingLocales[0];

export const landingPath = (locale: string): string => `/${locale}/landing`;

export const findLandingLocale = (locale: string): undefined | LandingLocale =>
    landingLocales.find(landingLocale => landingLocale.locale === locale)
;

export type LandingFeature = {
    key: LandingFeatureKey;

    /**
     * Screenshot of the feature.
     */
    image: LandingImage;

    /**
     * Smaller image shown over the main image corner.
     */
    inset?: LandingImage;

    /**
     * Page where this feature can be played right away (no guide or content page).
     */
    link: string;

    /**
     * spotlight: large image next to text, alternating sides.
     * card: smaller wide image above text, shown side by side.
     */
    layout: LandingFeatureLayout;

    /**
     * Shown next to title.
     */
    icon?: LandingIconName;
};

export type LandingFeatureLayout = 'spotlight' | 'card';

/**
 * Image path from site root, with its real size to prevent layout shift.
 */
export type LandingImage = { src: string, width: number, height: number };

/**
 * Features shown on landing page, in this order.
 * Consecutive features with same layout are grouped in a same section.
 */
export const landingFeatures: LandingFeature[] = [
    { key: 'live', layout: 'spotlight', image: { src: '/images/landing/live.webp', width: 1200, height: 588 }, link: '/' },
    { key: 'bots', layout: 'spotlight', icon: 'robot', image: { src: '/images/landing/bots.webp', width: 1200, height: 588 }, inset: { src: '/images/landing/bots_levels.webp', width: 376, height: 434 }, link: '/play-vs-ai' },
    { key: 'correspondence', layout: 'spotlight', image: { src: '/images/landing/correspondence.webp', width: 1000, height: 805 }, link: '/' },
    { key: 'tournaments', layout: 'spotlight', icon: 'trophy', image: { src: '/images/landing/tournaments.webp', width: 1200, height: 820 }, link: '/tournaments' },
    { key: 'ladder', layout: 'spotlight', icon: 'crown', image: { src: '/images/landing/ladder.webp', width: 1200, height: 1056 }, link: '/king-of-the-hill' },
    { key: 'puzzles', layout: 'spotlight', icon: 'puzzle', image: { src: '/images/landing/puzzles.webp', width: 1200, height: 844 }, link: '/puzzles' },
    { key: 'ai_analysis', layout: 'card', image: { src: '/images/landing/ai_analysis.webp', width: 584, height: 183 }, link: '/' },
    { key: 'ranked', layout: 'card', image: { src: '/images/landing/ranked.webp', width: 1000, height: 313 }, link: '/' },
    { key: 'devices', layout: 'spotlight', image: { src: '/images/landing/devices.webp', width: 400, height: 712 }, link: '/' },
    { key: 'tutorial', layout: 'spotlight', icon: 'mortarboard', image: { src: '/images/landing/tutorial.webp', width: 1200, height: 784 }, link: '/tutorial' },
];

export type LandingFeatureSection = {
    layout: LandingFeatureLayout;
    features: LandingFeature[];
};

/**
 * Groups consecutive features having same layout.
 */
export const groupLandingFeatures = (features: LandingFeature[]): LandingFeatureSection[] => {
    const sections: LandingFeatureSection[] = [];

    for (const feature of features) {
        const last = sections[sections.length - 1];

        if (last && last.layout === feature.layout) {
            last.features.push(feature);
        } else {
            sections.push({ layout: feature.layout, features: [feature] });
        }
    }

    return sections;
};
