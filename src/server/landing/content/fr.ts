import type { LandingContent } from './LandingContent.js';

export default {
    metaTitle: 'Jouer au Hex en ligne gratuitement',
    metaDescription: 'Jouez gratuitement au jeu de Hex en ligne contre des joueurs du monde entier ou contre une IA. Parties en direct et par correspondance, tournois, puzzles, analyse des parties par IA.',

    nav: {
        play: 'Jouer',
        tournaments: 'Tournois',
        ladder: 'Roi de la colline',
        puzzles: 'Puzzles',
        tutorial: 'Apprendre',
        language: 'Langue',
    },

    hero: {
        title: 'Jouer au Hex en ligne',
        subtitle: 'Jouez gratuitement au jeu de Hex contre des joueurs du monde entier, ou contre une IA.',
        tagline: 'Facile à apprendre, difficile à maîtriser.',
        cta: 'Jouer maintenant',
        ctaSecondary: 'Apprendre les règles',
    },

    features: {
        live: {
            title: 'Parties en temps réel',
            text: 'Jouez en blitz ou prenez votre temps avec des cadences personnalisables. Les pré-coups vous permettent de répondre instantanément, et vous pouvez discuter avec votre adversaire pendant la partie.',
            imageAlt: 'Une partie de Hex en temps réel sur PlayHex',
            linkLabel: 'Trouver un adversaire',
            highlights: ['Pré-coups pour répondre instantanément', 'Toutes les tailles de plateau, jusqu\'au 19×19 et au-delà'],
        },
        correspondence: {
            title: 'Parties par correspondance',
            text: 'Jouez à votre rythme, un coup par jour ou plus. Les coups conditionnels vous permettent de jouer à l\'avance les échelles et les séquences forcées, sans attendre votre adversaire.',
            imageAlt: 'Arbre de coups conditionnels dans une partie par correspondance',
            linkLabel: 'Jouer par correspondance',
            highlights: ['Coups conditionnels', 'Notifications quand c\'est votre tour'],
        },
        ai_analysis: {
            title: 'Analyse des parties par IA',
            text: 'Après la partie, une IA analyse chaque coup : voyez les meilleurs coups, vos erreurs, et qui gagnait à chaque moment de la partie.',
            imageAlt: 'Graphique des chances de victoire d\'une partie analysée par IA',
            linkLabel: 'Jouer une partie',
            highlights: ['Repérez vos erreurs et le coup qui vous aurait sauvé', 'Courbe des chances de victoire'],
        },
        ranked: {
            title: 'Parties classées',
            text: 'Obtenez un classement, affrontez des adversaires de votre niveau, et suivez votre progression sur votre courbe de classement.',
            imageAlt: 'Courbe de l\'historique de classement d\'un joueur',
            linkLabel: 'Jouer une partie classée',
            highlights: ['Classées en direct comme par correspondance', 'Statistiques face à chaque adversaire'],
        },
        devices: {
            title: 'Mobile et ordinateur',
            text: 'PlayHex fonctionne dans votre navigateur, sur téléphone, tablette et ordinateur. Rien à installer, et vos parties sont synchronisées entre vos appareils.',
            imageAlt: 'Une partie de Hex sur un téléphone',
            linkLabel: 'Jouer depuis le navigateur',
            highlights: ['Installable comme une application', 'Parties synchronisées entre appareils'],
        },
        tournaments: {
            title: 'Tournois',
            text: 'Participez à des tournois suisses ou à élimination, en direct ou par correspondance, et à des séries récurrentes pour retrouver les mêmes joueurs chaque semaine.',
            imageAlt: 'Résultats d\'un tournoi de Hex',
            linkLabel: 'Voir les tournois',
            highlights: ['Suisse, toutes rondes et élimination', 'Séries de tournois récurrents'],
        },
        ladder: {
            title: 'Roi de la colline',
            text: 'Défiez les joueurs classés au-dessus de vous, gagnez, et prenez leur place. Grimpez jusqu\'au sommet et défendez votre position.',
            imageAlt: 'Classement du Roi de la colline',
            linkLabel: 'Grimper la colline',
            highlights: ['Collines en direct et par correspondance', 'Historique de chaque règne'],
        },
        puzzles: {
            title: 'Puzzles',
            text: 'Entraînez votre tactique avec des puzzles créés par la communauté, du débutant à l\'expert, regroupés en collections.',
            imageAlt: 'Un puzzle de Hex',
            linkLabel: 'Résoudre des puzzles',
            highlights: ['Tout le monde peut en créer et en résoudre', 'Éditeur complet qui vérifie que votre puzzle est sans erreur'],
        },
        bots: {
            title: 'Jouer contre l\'IA',
            text: 'Entraînez-vous contre des bots de plusieurs niveaux, du débutant au très fort, même hors ligne.',
            imageAlt: 'Une partie contre une IA de Hex',
            linkLabel: 'Jouer contre l\'IA',
            highlights: ['Plusieurs niveaux de force', 'Jouable même hors ligne'],
        },
        tutorial: {
            title: 'Tutoriel interactif',
            text: 'Hex n\'a que deux règles. Apprenez-les en quelques minutes avec un tutoriel interactif, puis découvrez les stratégies de base.',
            imageAlt: 'Tutoriel interactif de Hex',
            linkLabel: 'Commencer le tutoriel',
            highlights: ['Les règles en quelques minutes', 'Les stratégies de base'],
        },
    },

    footer: {
        cta: 'Prêt à relier vos bords ?',
        free: 'PlayHex est gratuit, open source et sans publicité.',
    },
} satisfies LandingContent;
