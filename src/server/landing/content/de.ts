import type { LandingContent } from './LandingContent.js';

export default {
    metaTitle: 'Hex online kostenlos spielen',
    metaDescription: 'Spiele das Brettspiel Hex kostenlos online gegen Spieler aus aller Welt oder gegen eine KI. Live- und Fernpartien, Turniere, Rätsel und KI-Partieanalyse.',

    nav: {
        play: 'Spielen',
        tournaments: 'Turniere',
        ladder: 'King of the Hill',
        puzzles: 'Rätsel',
        tutorial: 'Lernen',
        language: 'Sprache',
    },

    hero: {
        title: 'Hex online spielen',
        subtitle: 'Spiele das Brettspiel Hex kostenlos gegen Spieler aus aller Welt oder gegen eine KI.',
        tagline: 'Leicht zu lernen, schwer zu meistern.',
        cta: 'Jetzt spielen',
        ctaSecondary: 'Regeln lernen',
    },

    features: {
        live: {
            title: 'Echtzeitpartien',
            text: 'Spiele Blitz oder lass dir Zeit mit einstellbaren Bedenkzeiten. Mit Vorab-Zügen antwortest du sofort, und im Chat kannst du dich mit deinem Gegner unterhalten.',
            imageAlt: 'Eine Hex-Partie in Echtzeit auf PlayHex',
            linkLabel: 'Gegner finden',
            highlights: ['Vorab-Züge für sofortige Antworten', 'Alle Brettgrößen, bis 19×19 und darüber hinaus'],
        },
        correspondence: {
            title: 'Fernpartien',
            text: 'Spiele in deinem eigenen Tempo, einen Zug pro Tag oder mehr. Mit bedingten Zügen spielst du Leitern und erzwungene Folgen im Voraus, ohne auf deinen Gegner zu warten.',
            imageAlt: 'Baum bedingter Züge in einer Fernpartie',
            linkLabel: 'Fernpartie spielen',
            highlights: ['Bedingte Züge', 'Benachrichtigung, wenn du am Zug bist'],
        },
        ai_analysis: {
            title: 'KI-Partieanalyse',
            text: 'Nach der Partie analysiert eine KI jeden Zug: Sieh dir die besten Züge, deine Fehler und den Spielstand zu jedem Zeitpunkt der Partie an.',
            imageAlt: 'Gewinnchancen-Diagramm einer von der KI analysierten Partie',
            linkLabel: 'Eine Partie spielen',
            highlights: ['Finde deine Fehler und den Zug, der dich gerettet hätte', 'Diagramm der Gewinnchancen'],
        },
        ranked: {
            title: 'Gewertete Partien',
            text: 'Erhalte eine Wertungszahl, spiele gegen Gegner auf deinem Niveau und verfolge deinen Fortschritt im Wertungsverlauf.',
            imageAlt: 'Wertungsverlauf eines Spielers',
            linkLabel: 'Gewertete Partie spielen',
            highlights: ['Gewertet live und als Fernpartie', 'Direktvergleich mit jedem Gegner'],
        },
        devices: {
            title: 'Handy und Computer',
            text: 'PlayHex läuft im Browser auf Handy, Tablet und Computer. Nichts zu installieren, und deine Partien sind zwischen deinen Geräten synchronisiert.',
            imageAlt: 'Eine Hex-Partie auf einem Handy',
            linkLabel: 'Im Browser spielen',
            highlights: ['Als App installierbar', 'Partien auf allen Geräten synchronisiert'],
        },
        tournaments: {
            title: 'Turniere',
            text: 'Nimm an Schweizer- oder K.-o.-Turnieren teil, live oder als Fernturnier, und an wiederkehrenden Serien, um jede Woche dieselben Spieler zu treffen.',
            imageAlt: 'Ergebnisse eines Hex-Turniers',
            linkLabel: 'Turniere ansehen',
            highlights: ['Schweizer System, Rundenturnier und K.-o.', 'Wiederkehrende Turnierserien'],
        },
        ladder: {
            title: 'King of the Hill',
            text: 'Fordere die Spieler über dir heraus, gewinne und nimm ihren Platz ein. Klettere an die Spitze und verteidige deine Position.',
            imageAlt: 'King-of-the-Hill-Rangliste',
            linkLabel: 'Den Hügel erklimmen',
            highlights: ['Live und als Fernpartie', 'Geschichte jeder Herrschaft'],
        },
        puzzles: {
            title: 'Rätsel',
            text: 'Trainiere deine Taktik mit Rätseln aus der Community, vom Anfänger bis zum Experten, in Sammlungen geordnet.',
            imageAlt: 'Ein Hex-Rätsel',
            linkLabel: 'Rätsel lösen',
            highlights: ['Jeder kann Rätsel erstellen und lösen', 'Vollständiger Editor, der dein Rätsel auf Fehler prüft'],
        },
        bots: {
            title: 'Gegen die KI spielen',
            text: 'Übe gegen Bots verschiedener Spielstärken, vom Anfänger bis sehr stark, auch offline.',
            imageAlt: 'Eine Partie gegen eine Hex-KI',
            linkLabel: 'Gegen die KI spielen',
            highlights: ['Mehrere Spielstärken', 'Auch offline spielbar'],
        },
        tutorial: {
            title: 'Interaktives Tutorial',
            text: 'Hex hat nur zwei Regeln. Lerne sie in wenigen Minuten mit einem interaktiven Tutorial und entdecke dann die grundlegenden Strategien.',
            imageAlt: 'Interaktives Hex-Tutorial',
            linkLabel: 'Tutorial starten',
            highlights: ['Die Regeln in wenigen Minuten', 'Grundlegende Strategien'],
        },
    },

    footer: {
        cta: 'Bereit, deine Seiten zu verbinden?',
        free: 'PlayHex ist kostenlos, Open Source und werbefrei.',
    },
} satisfies LandingContent;
