import type { LandingContent } from './LandingContent.js';

export default {
    metaTitle: 'Play Hex Online for Free',
    metaDescription: 'Play the Hex board game online for free against players from around the world or against AI. Live and correspondence games, tournaments, puzzles, AI game analysis.',

    nav: {
        play: 'Play',
        tournaments: 'Tournaments',
        ladder: 'King of the Hill',
        puzzles: 'Puzzles',
        tutorial: 'Learn',
        language: 'Language',
    },

    hero: {
        title: 'Play Hex Online',
        subtitle: 'Play the Hex board game for free against players from around the world, or against an AI.',
        tagline: 'Easy to learn, hard to master.',
        cta: 'Play now',
        ctaSecondary: 'Learn the rules',
    },

    features: {
        live: {
            title: 'Real-time games',
            text: 'Play blitz or take your time with customizable time controls. Premoves let you answer instantly, and chat with your opponent during the game.',
            imageAlt: 'A real-time Hex game on PlayHex',
            linkLabel: 'Find an opponent',
            highlights: ['Premoves to answer instantly', 'All board sizes, up to 19×19 and beyond'],
        },
        correspondence: {
            title: 'Correspondence games',
            text: 'Play at your own pace, a move a day or more. Conditional moves let you play ladders and forced sequences in advance, without waiting for your opponent.',
            imageAlt: 'Tree of conditional moves in a correspondence game',
            linkLabel: 'Play by correspondence',
            highlights: ['Conditional moves', 'Notifications when it is your turn'],
        },
        ai_analysis: {
            title: 'AI game analysis',
            text: 'After the game, an AI analyses every move: see the best moves, your mistakes, and who was winning at each moment of the game.',
            imageAlt: 'Win rate chart of a game analysed by AI',
            linkLabel: 'Play a game',
            highlights: ['Spot your mistakes and the move that would have saved you', 'Win rate chart of the game'],
        },
        ranked: {
            title: 'Ranked games',
            text: 'Get a rating, play opponents of your level, and follow your progress over time on your rating chart.',
            imageAlt: 'Rating history chart of a player',
            linkLabel: 'Play a ranked game',
            highlights: ['Ranked in live and correspondence alike', 'Head-to-head stats against each opponent'],
        },
        devices: {
            title: 'Mobile and desktop',
            text: 'PlayHex works in your browser on phone, tablet and computer. Nothing to install, and your games are synced between your devices.',
            imageAlt: 'A Hex game on a phone',
            linkLabel: 'Play from your browser',
            highlights: ['Installable as an app', 'Games synced between devices'],
        },
        tournaments: {
            title: 'Tournaments',
            text: 'Join Swiss or elimination tournaments, live or by correspondence, and recurring series to meet the same players every week.',
            imageAlt: 'Results of a Hex tournament',
            linkLabel: 'See tournaments',
            highlights: ['Swiss, round-robin and elimination', 'Recurring tournament series'],
        },
        ladder: {
            title: 'King of the Hill',
            text: 'Challenge the players ranked above you, win, and take their place. Climb to the top and defend your spot.',
            imageAlt: 'King of the Hill ranking',
            linkLabel: 'Climb the hill',
            highlights: ['Live and correspondence hills', 'History of every reign'],
        },
        puzzles: {
            title: 'Puzzles',
            text: 'Train your tactics with puzzles created by the community, from beginner to expert, grouped in collections.',
            imageAlt: 'A Hex puzzle',
            linkLabel: 'Solve puzzles',
            highlights: ['Everyone can create and solve puzzles', 'Full editor that checks your puzzle for mistakes'],
        },
        bots: {
            title: 'Play against AI',
            text: 'Practice against bots of several strength levels, from beginner to very strong, even offline.',
            imageAlt: 'A game against a Hex AI',
            linkLabel: 'Play against AI',
            highlights: ['Several strength levels', 'Playable even offline'],
        },
        tutorial: {
            title: 'Interactive tutorial',
            text: 'Hex has only two rules. Learn them in a few minutes with an interactive tutorial, then discover the basic strategies.',
            imageAlt: 'Interactive Hex tutorial',
            linkLabel: 'Start the tutorial',
            highlights: ['The rules in a few minutes', 'Basic strategies'],
        },
    },

    footer: {
        cta: 'Ready to connect your sides?',
        free: 'PlayHex is free, open source and without ads.',
    },
} satisfies LandingContent;
