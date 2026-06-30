/**
 * Locales written right-to-left. Compared against the base language (e.g. "ar" from "ar-EG").
 */
const rtlLocales = ['ar', 'fa', 'he', 'ur'];

export const isRtlLocale = (locale: string): boolean => rtlLocales.includes(locale.split(/[-_]/)[0]);

const bootstrapStylesheetId = 'bootstrap-stylesheet';

/**
 * Bootstrap ships separate LTR and RTL builds, and only one must be active at a time:
 * the RTL build flips physical properties (e.g. margin-left / margin-right) instead of
 * resetting them, so keeping both active would apply margins/paddings on both sides.
 * So we use a single Bootstrap <link> and swap its source on locale change.
 *
 * The LTR build is rendered up front in the page <head> (data-bootstrap-dir="ltr"), so for the
 * common LTR case this is a no-op and there is no flash. We swap to the RTL build by deriving
 * its URL from the rendered one (same path, just the file name), keeping any version query.
 */
export const setBootstrapStylesheet = (rtl: boolean): void => {
    const dir = rtl ? 'rtl' : 'ltr';
    const link = document.getElementById(bootstrapStylesheetId) as HTMLLinkElement | null;

    if (link === null || link.dataset.bootstrapDir === dir) {
        return;
    }

    link.href = rtl
        ? link.href.replace('bootstrap.min.css', 'bootstrap.rtl.min.css')
        : link.href.replace('bootstrap.rtl.min.css', 'bootstrap.min.css');
    link.dataset.bootstrapDir = dir;
};

/**
 * Apply the text direction for the given locale: sets the <html> dir attribute and the
 * matching Bootstrap stylesheet.
 */
export const applyTextDirection = (locale: string): void => {
    const rtl = isRtlLocale(locale);

    document.querySelector('html')!.setAttribute('dir', rtl ? 'rtl' : 'ltr');
    setBootstrapStylesheet(rtl);
};
