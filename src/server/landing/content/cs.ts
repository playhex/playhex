import type { LandingContent } from './LandingContent.js';

export default {
    metaTitle: 'Hrajte Hex online zdarma',
    metaDescription: 'Hrajte deskovou hru Hex online zdarma proti hráčům z celého světa nebo proti umělé inteligenci. Živé i korespondenční partie, turnaje, úlohy a analýza partií pomocí AI.',

    nav: {
        play: 'Hrát',
        tournaments: 'Turnaje',
        ladder: 'Král kopce',
        puzzles: 'Úlohy',
        tutorial: 'Naučit se',
        language: 'Jazyk',
    },

    hero: {
        title: 'Hrajte Hex online',
        subtitle: 'Hrajte deskovou hru Hex zdarma proti hráčům z celého světa nebo proti umělé inteligenci.',
        tagline: 'Snadno se naučíte, těžko ovládnete.',
        cta: 'Hrát hned',
        ctaSecondary: 'Naučit se pravidla',
    },

    features: {
        live: {
            title: 'Partie v reálném čase',
            text: 'Hrajte bleskovky, nebo si dejte na čas s nastavitelným časovým limitem. Přednastavené tahy vám umožní odpovědět okamžitě a během partie si můžete psát se soupeřem.',
            imageAlt: 'Partie Hexu v reálném čase na PlayHex',
            linkLabel: 'Najít soupeře',
            highlights: ['Přednastavené tahy pro okamžitou odpověď', 'Všechny velikosti desky, až 19×19 i více'],
        },
        correspondence: {
            title: 'Korespondenční partie',
            text: 'Hrajte vlastním tempem, třeba jeden tah denně. Podmíněné tahy vám umožní zahrát žebříky a vynucené sekvence předem, bez čekání na soupeře.',
            imageAlt: 'Strom podmíněných tahů v korespondenční partii',
            linkLabel: 'Hrát korespondenčně',
            highlights: ['Podmíněné tahy', 'Upozornění, když jste na tahu'],
        },
        ai_analysis: {
            title: 'Analýza partií pomocí AI',
            text: 'Po partii umělá inteligence rozebere každý tah: uvidíte nejlepší tahy, své chyby a kdo v každém okamžiku partie vyhrával.',
            imageAlt: 'Graf šancí na výhru v partii analyzované umělou inteligencí',
            linkLabel: 'Zahrát si partii',
            highlights: ['Najděte své chyby a tah, který by vás zachránil', 'Graf šancí na výhru'],
        },
        ranked: {
            title: 'Hodnocené partie',
            text: 'Získejte rating, hrajte se soupeři své úrovně a sledujte svůj pokrok v grafu ratingu.',
            imageAlt: 'Graf vývoje ratingu hráče',
            linkLabel: 'Hrát hodnocenou partii',
            highlights: ['Hodnocené živě i korespondenčně', 'Vzájemné statistiky s každým soupeřem'],
        },
        devices: {
            title: 'Mobil i počítač',
            text: 'PlayHex funguje v prohlížeči na telefonu, tabletu i počítači. Nic nemusíte instalovat a vaše partie jsou synchronizované mezi zařízeními.',
            imageAlt: 'Partie Hexu na mobilním telefonu',
            linkLabel: 'Hrát v prohlížeči',
            highlights: ['Lze nainstalovat jako aplikaci', 'Partie synchronizované mezi zařízeními'],
        },
        tournaments: {
            title: 'Turnaje',
            text: 'Zapojte se do turnajů švýcarským systémem nebo vyřazovacích turnajů, živých i korespondenčních, a do pravidelných sérií, kde se každý týden potkáte se stejnými hráči.',
            imageAlt: 'Výsledky turnaje v Hexu',
            linkLabel: 'Zobrazit turnaje',
            highlights: ['Švýcarský systém, každý s každým a vyřazovací', 'Pravidelné série turnajů'],
        },
        ladder: {
            title: 'Král kopce',
            text: 'Vyzvěte hráče umístěné nad vámi, porazte je a zaujměte jejich místo. Vyšplhejte se na vrchol a ubraňte svou pozici.',
            imageAlt: 'Pořadí hry Král kopce',
            linkLabel: 'Vyšplhat na kopec',
            highlights: ['Živě i korespondenčně', 'Historie každé vlády'],
        },
        puzzles: {
            title: 'Úlohy',
            text: 'Trénujte taktiku na úlohách vytvořených komunitou, od začátečnických po expertní, seřazených do sbírek.',
            imageAlt: 'Úloha v Hexu',
            linkLabel: 'Řešit úlohy',
            highlights: ['Každý může úlohy vytvářet i řešit', 'Kompletní editor, který vaši úlohu zkontroluje na chyby'],
        },
        bots: {
            title: 'Hra proti AI',
            text: 'Trénujte proti botům různé síly, od začátečníka po velmi silného soupeře, i bez připojení k internetu.',
            imageAlt: 'Partie proti umělé inteligenci v Hexu',
            linkLabel: 'Hrát proti AI',
            highlights: ['Několik úrovní síly', 'Hratelné i offline'],
        },
        tutorial: {
            title: 'Interaktivní tutoriál',
            text: 'Hex má jen dvě pravidla. Naučte se je za pár minut v interaktivním tutoriálu a pak objevte základní strategie.',
            imageAlt: 'Interaktivní tutoriál Hexu',
            linkLabel: 'Spustit tutoriál',
            highlights: ['Pravidla za pár minut', 'Základní strategie'],
        },
    },

    footer: {
        cta: 'Připraveni propojit své strany?',
        free: 'PlayHex je zdarma, open source a bez reklam.',
    },
} satisfies LandingContent;
