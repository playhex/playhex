import fs from 'node:fs';
import path from 'node:path';
import hexProgram from './hexProgram.js';

const localesDir = 'src/shared/app/i18n/locales';

type NestedObject = { [key: string]: string | NestedObject };

const getMissingKeys = (source: NestedObject, target: NestedObject, prefix = ''): NestedObject => {
    const missing: NestedObject = {};

    for (const key of Object.keys(source)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const sourceVal = source[key];
        const targetVal = target[key];

        if (typeof sourceVal === 'object' && sourceVal !== null) {
            const nestedMissing = getMissingKeys(
                sourceVal,
                typeof targetVal === 'object' && targetVal !== null ? targetVal : {},
                fullKey,
            );
            if (Object.keys(nestedMissing).length > 0) {
                missing[key] = nestedMissing;
            }
        } else if (targetVal === undefined) {
            missing[key] = sourceVal;
        }
    }

    return missing;
};

hexProgram
    .command('missing-translations')
    .description('Output missing translation keys in a locale compared to en.json that can be sent to AI for translation')
    .argument('<locale>', 'Target locale (e.g. fr, de, ja)')
    .action(locale => {
        const enPath = path.join(localesDir, 'en.json');
        const targetPath = path.join(localesDir, `${locale}.json`);

        if (!fs.existsSync(targetPath)) {
            const available = fs.readdirSync(localesDir)
                .filter(f => f.endsWith('.json') && f !== 'en.json')
                .map(f => f.replace('.json', ''))
            ;

            console.error(`Locale "${locale}" not found. Available locales: ${available.join(', ')}`);
            process.exit(1);
        }

        const en: NestedObject = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
        const target: NestedObject = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
        const missing = getMissingKeys(en, target);

        console.log(JSON.stringify(missing, null, 4));
    })
;
