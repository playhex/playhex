import fs from 'node:fs';
import path from 'node:path';
import hexProgram from './hexProgram.js';
import { availableLocales } from '../../shared/app/i18n/availableLocales.js';
import MissingTranslationsService, { type TranslationObject } from '../services/MissingTranslationsService.js';

const localesDir = 'src/shared/app/i18n/locales';

const readStdin = (): Promise<string> => new Promise(resolve => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk: string) => {
        data += chunk;
        // "EOF" on its own line acts as a terminator, like Ctrl+D
        if (/^EOF\s*$/m.test(data)) {
            resolve(data.replace(/\nEOF\s*$/, '').replace(/^EOF\s*$/, ''));
            process.stdin.destroy();
        }
    });
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

        const missingTranslationsService = new MissingTranslationsService('en', { ignoreDecimalPlurals: true });
        const en: TranslationObject = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
        const target: TranslationObject = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
        const missing = missingTranslationsService.getMissingKeys(en, target, locale);

        if (Object.keys(missing).length === 0) {
            console.log('No missing translations.');
            process.exit(0);
        }

        const label = availableLocales[locale]?.label ?? locale;
        const localeName = label.match(/\(([^)]+)\)/)?.[1] ?? label;
        const separator = '='.repeat(10);
        process.stderr.write(`${separator}\n`);
        console.log(missingTranslationsService.buildPrompt(missing, locale, localeName));
        process.stderr.write(`${separator}\n\nWaiting for ${localeName} translation... Paste translated JSON and press Ctrl+D (or type EOF on a new line)...\n`);

        const input = await readStdin();

        let translated: TranslationObject;
        try {
            translated = JSON.parse(input.trim());
        } catch {
            console.error('Invalid JSON input.');
            process.exit(1);
        }

        const updated = missingTranslationsService.deepMerge(target, translated);
        fs.writeFileSync(targetPath, JSON.stringify(updated, null, 4) + '\n', 'utf-8');

        console.error(`\n${locale}.json updated.`);
    })
;
