import assert from 'assert';
import { readFileSync } from 'node:fs';
import { describe, it } from 'mocha';
import i18next from 'i18next';
import { playerGender, playerPronouns } from '../playerPronouns.js';
import { Player, Tournament, TournamentParticipant } from '../models/index.js';
import { TournamentListItemDto } from '../models/TournamentListItemDto.js';
import { instanceToPlain, plainToInstance } from '../class-transformer-custom.js';

const resources = Object.fromEntries(['en', 'fr'].map(locale => [locale, {
    translation: JSON.parse(readFileSync(new URL(`../i18n/locales/${locale}.json`, import.meta.url), 'utf8')),
}]));

describe('player pronouns', () => {
    it('maps declared pronouns and old or absent player data to grammatical contexts', () => {
        assert.deepStrictEqual(playerPronouns.map(pronouns => playerGender({ pronouns })), ['male', 'female', 'other']);
        assert.strictEqual(playerGender({ pronouns: null }), 'other');
        assert.strictEqual(playerGender(), 'other');
        assert.strictEqual(playerGender(null), 'other');
        assert.strictEqual(playerGender(new Player()), 'other');
    });

    it('exposes pronouns wherever public players are serialized', () => {
        const player = new Player();
        player.pronouns = 'she/her';
        for (const group of ['_default', 'rating', 'playerNotification', 'lobby', 'puzzle', 'channel', 'player_moderation_action']) {
            assert.strictEqual(instanceToPlain(player, { groups: [group] }).pronouns, 'she/her');
        }
        assert.strictEqual(plainToInstance(Player, { pronouns: 'they/them' }).pronouns, 'they/them');
    });

    it('uses base strings for neutral context and omits identical gender variants', () => {
        const check = (node: Record<string, unknown>): void => {
            for (const [key, value] of Object.entries(node)) {
                if (typeof value === 'object' && value !== null) {
                    check(value as Record<string, unknown>);
                } else if (key.endsWith('_male') || key.endsWith('_female')) {
                    const base = key.replace(/_(male|female)$/, '');
                    assert.notStrictEqual(value, node[base], key);
                    assert.strictEqual(node[base + '_other'], undefined, key);
                }
            }
        };
        for (const resource of Object.values(resources)) {
            check(resource.translation as Record<string, unknown>);
        }
    });

    it('exposes winner pronouns in tournament lists and uses them in the winner label', async () => {
        const player = Object.assign(new Player(), { pseudo: 'Alex', publicId: 'alex', isGuest: false });
        const tournament = new Tournament();
        tournament.participants = [Object.assign(new TournamentParticipant(), { rank: 1, player })];
        const i18n = i18next.createInstance();
        await i18n.init({ lng: 'fr', resources });
        for (const [pronouns, label] of [['she/her', 'Dernière gagnante :'], ['he/him', 'Dernier gagnant :'], [null, 'Dernier(ère) gagnant(e) :']] as const) {
            player.pronouns = pronouns;
            const winner = TournamentListItemDto.fromTournament(tournament).rank1Participant;
            assert.strictEqual(winner?.pronouns, pronouns);
            assert.strictEqual(i18n.t('tournament_series_list_page.last_winner', { context: playerGender(winner) }), label);
        }
    });

    it('uses host and viewer pronouns for game rules and the ladder introduction', async () => {
        const i18n = i18next.createInstance();
        await i18n.init({ lng: 'fr', resources });
        for (const [pronouns, label, agreement] of [['she/her', 'hôte joue 1ère', 'haute'], ['he/him', 'hôte joue 1er', 'haut'], [null, 'hôte joue 1er(ère)', 'haut(e)']] as const) {
            const context = playerGender({ pronouns });
            assert.strictEqual(i18n.t('game_rules.host_plays_first', { context }), label);
            assert.ok(i18n.t('ladder.intro', { context }).includes(`Plus vous êtes ${agreement},`));
        }
    });

    it('selects gendered English possessives and neutral fallbacks', async () => {
        const i18n = i18next.createInstance();
        await i18n.init({ lng: 'en', resources });
        for (const [pronouns, possessive] of [['he/him', 'his'], ['she/her', 'her'], ['they/them', 'their'], [null, 'their']] as const) {
            assert.strictEqual(i18n.t('undo.player_takeback_his_move', { player: 'Alex', context: playerGender({ pronouns }) }), `Alex took back ${possessive} move.`);
        }
        assert.strictEqual(i18n.t('undo.player_takeback_his_move', { player: 'Alex' }), 'Alex took back their move.');
        assert.strictEqual(i18n.t('ladder.event.challenge_defended', { player: 'Sam', opponent: 'Alex', context: playerGender({ pronouns: 'she/her' }) }), 'Alex defended her seat against Sam');
    });

    it('uses Queen only for a female hill leader and otherwise falls back to King', async () => {
        const i18n = i18next.createInstance();
        await i18n.init({ lng: 'fr', resources });
        for (const locale of ['fr', 'en']) {
            await i18n.changeLanguage(locale);
            for (const pronouns of [...playerPronouns, null]) {
                const context = playerGender({ pronouns });
                const queen = pronouns === 'she/her';
                const title = locale === 'fr' ? (queen ? 'Reine de la colline' : 'Roi de la colline') : (queen ? 'Queen of the Hill' : 'King of the Hill');
                assert.strictEqual(i18n.t('ladder.title', { context }), title);
                assert.strictEqual(i18n.t('ladder.king', { context }), title);
                assert.strictEqual(i18n.t('ladder.king_for', { context, duration: '2h' }), locale === 'fr'
                    ? `${queen ? 'Reine' : 'Roi'} depuis 2h`
                    : `${queen ? 'Queen' : 'King'} for 2h`);
            }
        }
    });

    it('adapts first-person choices and tournament participation to the account pronouns', async () => {
        const i18n = i18next.createInstance();
        await i18n.init({ lng: 'fr', resources });
        assert.strictEqual(i18n.t('i_play.first', { context: 'female' }), 'Première');
        assert.strictEqual(i18n.t('i_play.first', { context: 'male' }), 'Premier');
        assert.strictEqual(i18n.t('i_play.second', { context: 'female' }), 'Deuxième');
        assert.strictEqual(i18n.t('tournament_subscribe', { context: 'female' }), 'Je suis intéressée !');
        assert.strictEqual(i18n.t('tournament_unsubscribe', { context: 'female' }), 'Je ne suis plus intéressée.');
        assert.strictEqual(i18n.t('tournament_subscription.subscribed', { context: 'female' }), 'Vous êtes intéressée');
        assert.strictEqual(i18n.t('ladder.nobody_to_challenge', { context: 'female' }), 'Personne à défier : vous êtes la Reine !');
        assert.strictEqual(i18n.t('ladder.nobody_to_challenge', { context: 'other' }), 'Personne à défier : vous êtes le Roi !');
        await i18n.changeLanguage('en');
        assert.strictEqual(i18n.t('i_play.first', { context: 'female' }), 'First');
        assert.strictEqual(i18n.t('undo.player_wants_to_takeback', { player: 'Alex', context: 'female' }), 'Alex wants to take back her move');
        assert.strictEqual(i18n.t('undo.player_wants_to_takeback', { player: 'Alex', context: 'male' }), 'Alex wants to take back his move');
        assert.strictEqual(i18n.t('undo.player_wants_to_takeback', { player: 'Alex', context: 'other' }), 'Alex wants to take back their move');
    });

    it('keeps confirmation wording with masculine, feminine and inclusive agreements', async () => {
        const i18n = i18next.createInstance();
        await i18n.init({ lng: 'fr', resources });
        const keys = [
            'pass_confirm_overlay.message',
            'resign_confirm_overlay.message',
            'confirm_overlay.are_you_sure?',
            'manage_tournament_page.start_now_confirm',
            'manage_tournament_page.cancel_tournament_confirm',
            'tournament_series_manage_page.delete_confirm',
        ];
        for (const key of keys) {
            for (const [pronouns, agreement] of [['he/him', 'sûr'], ['she/her', 'sûre'], ['they/them', 'sûr(e)'], [null, 'sûr(e)']] as const) {
                const translated = i18n.t(key, { context: playerGender({ pronouns }) });
                assert.ok(translated.includes(`Êtes-vous ${agreement}`), `${key}: ${translated}`);
                assert.ok(!translated.includes('Confirmez-vous'));
            }
            assert.ok(i18n.t(key).includes('sûr(e)'));
        }
        await i18n.changeLanguage('en');
        assert.strictEqual(i18n.t('pass_confirm_overlay.message', { context: 'female' }), i18n.t('pass_confirm_overlay.message'));
    });

    it('uses neutral tournament history for old logs and feminine agreements with context', async () => {
        const i18n = i18next.createInstance();
        await i18n.init({ lng: 'fr', resources });
        for (const [key, neutral, female] of [
            ['player_subscribed', 'Alex est intéressé(e)', 'Alex est intéressée'],
            ['player_unsubscribed', "Alex n'est plus intéressé(e)", "Alex n'est plus intéressée"],
            ['player_checked_in', 'Alex s’est enregistré(e)', 'Alex s’est enregistrée'],
            ['player_kicked', 'Alex a été exclu(e)', 'Alex a été exclue'],
            ['player_banned', 'Alex a été banni(e) de ce tournoi', 'Alex a été bannie de ce tournoi'],
        ]) {
            assert.strictEqual(i18n.t(`tournament_history.${key}`, { playerPseudo: 'Alex' }), neutral);
            assert.strictEqual(i18n.t(`tournament_history.${key}`, { playerPseudo: 'Alex', context: 'female' }), female);
        }
    });

    it('uses feminine French agreements and inclusive fallback wording', async () => {
        const i18n = i18next.createInstance();
        await i18n.init({ lng: 'fr', resources });
        assert.strictEqual(i18n.t('ladder.notification.challenge', { player: 'Alex', context: 'female' }), 'Alex vous a défiée au Roi de la colline !');
        assert.strictEqual(i18n.t('ladder.event.cheat', { player: 'Alex', opponent: 'Sam', context: 'female' }), 'Alex a été renvoyée tout en bas pour triche, partie contre Sam annulée');
        for (const context of ['male', 'female', 'other']) {
            assert.strictEqual(i18n.t('undo.player_takeback_his_move', { player: 'Alex', context }), 'Alex a repris son coup.');
        }
        assert.strictEqual(i18n.t('player_loses_reason.forfeit', { context: 'female' }), '{player} est déclarée forfait.');
        assert.strictEqual(i18n.t('player_loses_reason.forfeit', { context: 'other' }), '{player} est déclaré(e) forfait.');
        assert.strictEqual(i18n.t('social_preview.player.title', { player: 'Alex', context: 'female' }), 'Alex, joueuse de Hex');
        assert.strictEqual(i18n.t('social_preview.player.title', { player: 'Alex', context: 'other' }), 'Alex, joueur(se) de Hex');
    });
});
