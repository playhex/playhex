import type { LandingContent } from './LandingContent.js';

export default {
    metaTitle: 'Spela Hex online gratis',
    metaDescription: 'Spela brädspelet Hex gratis online mot spelare från hela världen eller mot en AI. Live- och korrespondenspartier, turneringar, pussel, AI-analys av partier.',

    nav: {
        play: 'Spela',
        tournaments: 'Turneringar',
        ladder: 'Kung på berget',
        puzzles: 'Pussel',
        tutorial: 'Lär dig',
        language: 'Språk',
    },

    hero: {
        title: 'Spela Hex online',
        subtitle: 'Spela brädspelet Hex gratis mot spelare från hela världen, eller mot en AI.',
        tagline: 'Lätt att lära sig, svårt att bemästra.',
        cta: 'Spela nu',
        ctaSecondary: 'Lär dig reglerna',
    },

    features: {
        live: {
            title: 'Partier i realtid',
            text: 'Spela blixt eller ta god tid på dig med anpassningsbar betänketid. Med fördrag kan du svara direkt, och du kan chatta med din motståndare under partiet.',
            imageAlt: 'Ett Hex-parti i realtid på PlayHex',
            linkLabel: 'Hitta en motståndare',
            highlights: ['Fördrag för att svara direkt', 'Alla brädstorlekar, upp till 19×19 och större'],
        },
        correspondence: {
            title: 'Korrespondenspartier',
            text: 'Spela i din egen takt, ett drag om dagen eller mer. Med villkorliga drag kan du spela stegar och tvingade sekvenser i förväg, utan att vänta på din motståndare.',
            imageAlt: 'Träd av villkorliga drag i ett korrespondensparti',
            linkLabel: 'Spela korrespondens',
            highlights: ['Villkorliga drag', 'Aviseringar när det är din tur'],
        },
        ai_analysis: {
            title: 'AI-analys av partier',
            text: 'Efter partiet analyserar en AI varje drag: se de bästa dragen, dina misstag och vem som ledde vid varje tidpunkt i partiet.',
            imageAlt: 'Diagram över vinstchanser i ett parti analyserat av AI',
            linkLabel: 'Spela ett parti',
            highlights: ['Hitta dina misstag och draget som kunde ha räddat dig', 'Diagram över vinstchanser i partiet'],
        },
        ranked: {
            title: 'Rankade partier',
            text: 'Få en rating, möt motståndare på din nivå och följ din utveckling över tid i ditt ratingdiagram.',
            imageAlt: 'Diagram över en spelares ratinghistorik',
            linkLabel: 'Spela ett rankat parti',
            highlights: ['Rankat både live och i korrespondens', 'Inbördes statistik mot varje motståndare'],
        },
        devices: {
            title: 'Mobil och dator',
            text: 'PlayHex fungerar i din webbläsare på mobil, surfplatta och dator. Inget att installera, och dina partier synkroniseras mellan dina enheter.',
            imageAlt: 'Ett Hex-parti på en mobil',
            linkLabel: 'Spela i webbläsaren',
            highlights: ['Kan installeras som en app', 'Partier synkroniserade mellan enheter'],
        },
        tournaments: {
            title: 'Turneringar',
            text: 'Delta i schweiziska turneringar eller utslagsturneringar, live eller i korrespondens, och i återkommande serier där du möter samma spelare varje vecka.',
            imageAlt: 'Resultat från en Hex-turnering',
            linkLabel: 'Se turneringar',
            highlights: ['Schweizisk, alla-mot-alla och utslag', 'Återkommande turneringsserier'],
        },
        ladder: {
            title: 'Kung på berget',
            text: 'Utmana spelarna som är rankade ovanför dig, vinn och ta deras plats. Klättra till toppen och försvara din plats.',
            imageAlt: 'Ranking i Kung på berget',
            linkLabel: 'Klättra upp på berget',
            highlights: ['Berg live och i korrespondens', 'Historik över varje regeringstid'],
        },
        puzzles: {
            title: 'Pussel',
            text: 'Träna din taktik med pussel skapade av gemenskapen, från nybörjare till expert, samlade i samlingar.',
            imageAlt: 'Ett Hex-pussel',
            linkLabel: 'Lös pussel',
            highlights: ['Alla kan skapa och lösa pussel', 'Komplett redigerare som kontrollerar ditt pussel efter fel'],
        },
        bots: {
            title: 'Spela mot AI',
            text: 'Öva mot bottar på flera nivåer, från nybörjare till mycket stark, till och med offline.',
            imageAlt: 'Ett parti mot en Hex-AI',
            linkLabel: 'Spela mot AI',
            highlights: ['Flera styrkenivåer', 'Spelbart till och med offline'],
        },
        tutorial: {
            title: 'Interaktiv handledning',
            text: 'Hex har bara två regler. Lär dig dem på några minuter med en interaktiv handledning och upptäck sedan grundstrategierna.',
            imageAlt: 'Interaktiv handledning i Hex',
            linkLabel: 'Starta handledningen',
            highlights: ['Reglerna på några minuter', 'Grundstrategierna'],
        },
    },

    footer: {
        cta: 'Redo att förbinda dina sidor?',
        free: 'PlayHex är gratis, öppen källkod och utan reklam.',
    },
} satisfies LandingContent;
