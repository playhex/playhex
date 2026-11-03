import type { LandingContent } from './LandingContent.js';

export default {
    metaTitle: 'Spil Hex online gratis',
    metaDescription: 'Spil brætspillet Hex gratis online mod spillere fra hele verden eller mod en AI. Live- og korrespondancepartier, turneringer, opgaver, AI-analyse af partier.',

    nav: {
        play: 'Spil',
        tournaments: 'Turneringer',
        ladder: 'Bakkens konge',
        puzzles: 'Opgaver',
        tutorial: 'Lær',
        language: 'Sprog',
    },

    hero: {
        title: 'Spil Hex online',
        subtitle: 'Spil brætspillet Hex gratis mod spillere fra hele verden, eller mod en AI.',
        tagline: 'Let at lære, svært at mestre.',
        cta: 'Spil nu',
        ctaSecondary: 'Lær reglerne',
    },

    features: {
        live: {
            title: 'Partier i realtid',
            text: 'Spil lyn eller tag den med ro med tidskontroller, du selv vælger. Forhåndstræk lader dig svare med det samme, og du kan chatte med din modstander under partiet.',
            imageAlt: 'Et Hex-parti i realtid på PlayHex',
            linkLabel: 'Find en modstander',
            highlights: ['Forhåndstræk til at svare med det samme', 'Alle brætstørrelser, op til 19×19 og større'],
        },
        correspondence: {
            title: 'Korrespondancepartier',
            text: 'Spil i dit eget tempo, ét træk om dagen eller mere. Betingede træk lader dig spille stiger og tvungne sekvenser på forhånd uden at vente på din modstander.',
            imageAlt: 'Træ af betingede træk i et korrespondanceparti',
            linkLabel: 'Spil korrespondance',
            highlights: ['Betingede træk', 'Notifikationer, når det er din tur'],
        },
        ai_analysis: {
            title: 'AI-analyse af partier',
            text: 'Efter partiet analyserer en AI hvert træk: se de bedste træk, dine fejl og hvem der var foran på hvert tidspunkt i partiet.',
            imageAlt: 'Graf over vinderchancer i et parti analyseret af AI',
            linkLabel: 'Spil et parti',
            highlights: ['Find dine fejl og det træk, der kunne have reddet dig', 'Graf over vinderchancer i partiet'],
        },
        ranked: {
            title: 'Ranglistede partier',
            text: 'Få en rating, spil mod modstandere på dit niveau, og følg din udvikling over tid på din ratinggraf.',
            imageAlt: 'Graf over en spillers ratinghistorik',
            linkLabel: 'Spil et ranglistet parti',
            highlights: ['Ranglistet både live og i korrespondance', 'Statistik mod hver modstander'],
        },
        devices: {
            title: 'Mobil og computer',
            text: 'PlayHex virker i din browser på telefon, tablet og computer. Intet at installere, og dine partier synkroniseres mellem dine enheder.',
            imageAlt: 'Et Hex-parti på en telefon',
            linkLabel: 'Spil i din browser',
            highlights: ['Kan installeres som en app', 'Partier synkroniseret mellem enheder'],
        },
        tournaments: {
            title: 'Turneringer',
            text: 'Deltag i schweizer- eller knockoutturneringer, live eller i korrespondance, og i tilbagevendende serier, hvor du møder de samme spillere hver uge.',
            imageAlt: 'Resultater fra en Hex-turnering',
            linkLabel: 'Se turneringer',
            highlights: ['Schweizer, alle-mod-alle og knockout', 'Tilbagevendende turneringsserier'],
        },
        ladder: {
            title: 'Bakkens konge',
            text: 'Udfordr spillerne, der er placeret over dig, vind og tag deres plads. Kæmp dig op til toppen, og forsvar din plads.',
            imageAlt: 'Rangliste for Bakkens konge',
            linkLabel: 'Bestig bakken',
            highlights: ['Bakker live og i korrespondance', 'Historik over hver regeringstid'],
        },
        puzzles: {
            title: 'Opgaver',
            text: 'Træn din taktik med opgaver lavet af fællesskabet, fra begynder til ekspert, samlet i samlinger.',
            imageAlt: 'En Hex-opgave',
            linkLabel: 'Løs opgaver',
            highlights: ['Alle kan lave og løse opgaver', 'Komplet editor, der tjekker din opgave for fejl'],
        },
        bots: {
            title: 'Spil mod AI',
            text: 'Øv dig mod bots på flere niveauer, fra begynder til meget stærk, endda offline.',
            imageAlt: 'Et parti mod en Hex-AI',
            linkLabel: 'Spil mod AI',
            highlights: ['Flere styrkeniveauer', 'Kan spilles endda offline'],
        },
        tutorial: {
            title: 'Interaktiv tutorial',
            text: 'Hex har kun to regler. Lær dem på få minutter med en interaktiv tutorial, og opdag derefter de grundlæggende strategier.',
            imageAlt: 'Interaktiv Hex-tutorial',
            linkLabel: 'Start tutorialen',
            highlights: ['Reglerne på få minutter', 'Grundlæggende strategier'],
        },
    },

    footer: {
        cta: 'Klar til at forbinde dine sider?',
        free: 'PlayHex er gratis, open source og uden reklamer.',
    },
} satisfies LandingContent;
