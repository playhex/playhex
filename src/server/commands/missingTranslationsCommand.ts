import fs from 'node:fs';
import path from 'node:path';
import hexProgram from './hexProgram.js';
import { availableLocales } from '../../shared/app/i18n/availableLocales.js';

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

const deepMerge = (target: NestedObject, patch: NestedObject): NestedObject => {
    const result: NestedObject = { ...target };

    for (const key of Object.keys(patch)) {
        const patchVal = patch[key];
        const targetVal = target[key];

        if (typeof patchVal === 'object' && patchVal !== null && typeof targetVal === 'object' && targetVal !== null) {
            result[key] = deepMerge(targetVal, patchVal);
        } else {
            result[key] = patchVal;
        }
    }

    return result;
};

const readStdin = (): Promise<string> => new Promise(resolve => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => data += String(chunk));
    process.stdin.on('end', () => resolve(data));
});

hexProgram
    .command('missing-translations')
    .description('Output missing translation keys in a locale compared to en.json that can be sent to AI for translation')
    .argument('<locale>', 'Target locale (e.g. fr, de, ja)')
    .action(async locale => {
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

        if (Object.keys(missing).length === 0) {
            console.log('No missing translations.');
            process.exit(0);
        }

        const label = availableLocales[locale]?.label ?? locale;
        const localeName = label.match(/\(([^)]+)\)/)?.[1] ?? label;
        const separator = '='.repeat(10);
        process.stderr.write(`${separator}\nTranslate to ${localeName}:\n\n`);
        console.log(JSON.stringify(missing, null, 4));
        process.stderr.write(`${separator}\n\nWaiting for ${localeName} translation... Paste translated JSON and press Ctrl+D...\n`);

        const input = await readStdin();

        let translated: NestedObject;
        try {
            translated = JSON.parse(input.trim());
        } catch {
            console.error('Invalid JSON input.');
            process.exit(1);
        }

        const updated = deepMerge(target, translated);
        fs.writeFileSync(targetPath, JSON.stringify(updated, null, 4) + '\n', 'utf-8');

        console.error(`\n${locale}.json updated.`);
    })
;
