import type { LandingContent } from './LandingContent.js';

export default {
    metaTitle: 'Gratis Hex online spelen',
    metaDescription: 'Speel het bordspel Hex gratis online tegen spelers van over de hele wereld of tegen een AI. Live- en correspondentiepartijen, toernooien, puzzels, AI-analyse van partijen.',

    nav: {
        play: 'Spelen',
        tournaments: 'Toernooien',
        ladder: 'Koning van de heuvel',
        puzzles: 'Puzzels',
        tutorial: 'Leren',
        language: 'Taal',
    },

    hero: {
        title: 'Speel Hex online',
        subtitle: 'Speel het bordspel Hex gratis tegen spelers van over de hele wereld, of tegen een AI.',
        tagline: 'Makkelijk te leren, moeilijk te beheersen.',
        cta: 'Nu spelen',
        ctaSecondary: 'Leer de regels',
    },

    features: {
        live: {
            title: 'Live partijen',
            text: 'Speel blitz of neem de tijd met instelbare bedenktijden. Met voorzetten antwoord je direct, en je kunt tijdens de partij chatten met je tegenstander.',
            imageAlt: 'Een live Hex-partij op PlayHex',
            linkLabel: 'Zoek een tegenstander',
            highlights: ['Voorzetten om direct te antwoorden', 'Alle bordgroottes, tot 19×19 en groter'],
        },
        correspondence: {
            title: 'Correspondentiepartijen',
            text: 'Speel in je eigen tempo, één zet per dag of meer. Met voorwaardelijke zetten speel je ladders en gedwongen reeksen vooruit, zonder op je tegenstander te wachten.',
            imageAlt: 'Boom van voorwaardelijke zetten in een correspondentiepartij',
            linkLabel: 'Speel per correspondentie',
            highlights: ['Voorwaardelijke zetten', 'Meldingen wanneer je aan zet bent'],
        },
        ai_analysis: {
            title: 'AI-analyse van partijen',
            text: 'Na de partij analyseert een AI elke zet: zie de beste zetten, je fouten en wie er op elk moment van de partij aan het winnen was.',
            imageAlt: 'Grafiek van de winkansen van een door AI geanalyseerde partij',
            linkLabel: 'Speel een partij',
            highlights: ['Vind je fouten en de zet die je had kunnen redden', 'Grafiek van de winkansen in de partij'],
        },
        ranked: {
            title: 'Gerangschikte partijen',
            text: 'Krijg een rating, speel tegen tegenstanders van jouw niveau en volg je vooruitgang op je ratinggrafiek.',
            imageAlt: 'Grafiek van de ratinggeschiedenis van een speler',
            linkLabel: 'Speel een gerangschikte partij',
            highlights: ['Gerangschikt zowel live als per correspondentie', 'Onderlinge statistieken tegen elke tegenstander'],
        },
        devices: {
            title: 'Mobiel en computer',
            text: 'PlayHex werkt in je browser, op telefoon, tablet en computer. Niets te installeren, en je partijen worden gesynchroniseerd tussen je apparaten.',
            imageAlt: 'Een Hex-partij op een telefoon',
            linkLabel: 'Speel in je browser',
            highlights: ['Installeerbaar als app', 'Partijen gesynchroniseerd tussen apparaten'],
        },
        tournaments: {
            title: 'Toernooien',
            text: 'Doe mee aan Zwitserse of knock-outtoernooien, live of per correspondentie, en aan terugkerende series om elke week dezelfde spelers te treffen.',
            imageAlt: 'Uitslagen van een Hex-toernooi',
            linkLabel: 'Bekijk toernooien',
            highlights: ['Zwitsers, round-robin en knock-out', 'Terugkerende toernooiseries'],
        },
        ladder: {
            title: 'Koning van de heuvel',
            text: 'Daag de spelers uit die boven je staan, win en neem hun plaats in. Klim naar de top en verdedig je positie.',
            imageAlt: 'Ranglijst van Koning van de heuvel',
            linkLabel: 'Beklim de heuvel',
            highlights: ['Live- en correspondentieheuvels', 'Geschiedenis van elke regeerperiode'],
        },
        puzzles: {
            title: 'Puzzels',
            text: 'Train je tactiek met puzzels gemaakt door de community, van beginner tot expert, gegroepeerd in collecties.',
            imageAlt: 'Een Hex-puzzel',
            linkLabel: 'Puzzels oplossen',
            highlights: ['Iedereen kan puzzels maken en oplossen', 'Volledige editor die je puzzel op fouten controleert'],
        },
        bots: {
            title: 'Speel tegen AI',
            text: 'Oefen tegen bots van verschillende sterktes, van beginner tot zeer sterk, zelfs offline.',
            imageAlt: 'Een partij tegen een Hex-AI',
            linkLabel: 'Speel tegen AI',
            highlights: ['Verschillende speelsterktes', 'Zelfs offline speelbaar'],
        },
        tutorial: {
            title: 'Interactieve tutorial',
            text: 'Hex heeft maar twee regels. Leer ze in een paar minuten met een interactieve tutorial en ontdek daarna de basisstrategieën.',
            imageAlt: 'Interactieve Hex-tutorial',
            linkLabel: 'Start de tutorial',
            highlights: ['De regels in een paar minuten', 'Basisstrategieën'],
        },
    },

    footer: {
        cta: 'Klaar om je zijden te verbinden?',
        free: 'PlayHex is gratis, open source en zonder advertenties.',
    },
} satisfies LandingContent;
