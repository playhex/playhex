import assert from 'assert';
import { HostedGame } from '../models/index.js';
import { plainToInstance } from '../class-transformer-custom.js';
import { hostedGameToSGF } from '../hostedGameToSGF.js';

describe('hostedGameToSGF', () => {
    it('generates SGF from an HostedGame instance', () => {
        const hostedGame: HostedGame = plainToInstance(HostedGame, {
            movesHistory: [
                {
                    row: 1,
                    col: 0,
                    playedAt: '2024-08-27T20:00:00.000Z',
                },
                {
                    row: -1,
                    col: -1,
                    specialMoveType: 'swap-pieces',
                    playedAt: '2024-08-27T20:00:10.000Z',
                },
                {
                    row: 4,
                    col: 10,
                    playedAt: '2024-08-27T20:00:20.000Z',
                },
                {
                    row: 5,
                    col: 5,
                    playedAt: '2024-08-27T20:00:30.000Z',
                },
                {
                    row: 2,
                    col: 4,
                    playedAt: '2024-08-27T20:00:50.000Z',
                },
            ],
            winner: 0,
            outcome: 'resign',
            startedAt: '2024-08-27T20:00:00.000Z',
            lastMoveAt: '2024-08-27T20:00:50.000Z',
            endedAt: '2024-08-27T20:01:00.000Z',
            currentPlayerIndex: 1,
            undoRequest: null,
            rematch: null,
            rematchedFrom: null,
            createdAt: '2024-08-27T20:00:00.000Z',
            publicId: 'b9113964-070b-4b7a-84c1-a7b590261ec7',
            host: {
                pseudo: 'aaa',
                publicId: '0e6ecf83-7f91-4413-98e2-ce09194b3afe',
                isGuest: false,
                isBot: false,
                slug: 'aaa',
                createdAt: '2024-08-25T14:09:33.524Z',
                currentRating: null,
            },
            hostedGameToPlayers: [
                {
                    player: {
                        pseudo: 'Random bot',
                        publicId: '53ccc84c-c73b-40b2-9ee2-21ca2182ac85',
                        isGuest: false,
                        isBot: true,
                        slug: 'random-bot',
                        createdAt: '2023-01-01T00:00:00.000Z',
                        currentRating: {
                            category: 'overall',
                            createdAt: '2024-08-22T00:52:51.000Z',
                            rating: 1266.36,
                            deviation: 68.9991,
                            volatility: 0.0601171,
                            ratingChange: -2.1114,
                        },
                    },
                },
                {
                    player: {
                        pseudo: 'aaa',
                        publicId: '0e6ecf83-7f91-4413-98e2-ce09194b3afe',
                        isGuest: false,
                        isBot: false,
                        slug: 'aaa',
                        createdAt: '2024-08-25T14:09:33.524Z',
                        currentRating: null,
                    },
                },
            ],
            state: 'ended',
            ranked: false,
            boardsize: 11,
            firstPlayer: 1,
            swapRule: true,
            opponentType: 'ai',
            opponentPublicId: '53ccc84c-c73b-40b2-9ee2-21ca2182ac85',
            timeControlType: {
                family: 'fischer',
                options: {
                    initialTime: 600000,
                    timeIncrement: 5000,
                    maxTime: 600000,
                },
            },
            timeControl: {
                state: 'over',
                currentPlayer: 1,
                players: [
                    {
                        totalRemainingTime: 600000,
                    },
                    {
                        totalRemainingTime: 598792,
                    },
                ],
            },
            chatMessages: [],
            ratings: [],
        });

        assert.strictEqual(
            hostedGameToSGF(hostedGame),
            '(;FF[4]CA[UTF-8]AP[PlayHex:0.0.0]SO[PlayHex.org]PC[https://playhex.org/games/b9113964-070b-4b7a-84c1-a7b590261ec7]GM[11]SZ[11]PB[Random bot]PW[aaa]DT[2024-08-27]HA[0]RE[B+Resign]TM[600]OT[fischer 5 capped];B[a2]BL[600];W[swap-pieces]WL[595];B[k5]BL[595];W[f6]WL[590];B[e3]BL[580])',
        );
    });

    it('generates SGF from a byo yomi game', () => {
        const hostedGame: HostedGame = plainToInstance(HostedGame, {
            publicId: '99efbf69-a506-4438-9c39-f3daeaf55d37',
            host: {
                pseudo: 'Aaaa',
                publicId: '720b3d57-bccf-418e-a67a-9b785ea92e97',
                isGuest: false,
                isBot: false,
                slug: 'aaaa',
                createdAt: '2025-08-20T15:43:00.000Z',
                currentRating: null,
            },
            hostedGameToPlayers: [
                {
                    player: {
                        pseudo: 'Davies 7',
                        publicId: 'a45ce9f7-9167-46ad-9867-d35adc860037',
                        isGuest: false,
                        isBot: true,
                        slug: 'davies-7',
                        createdAt: '2025-08-11T21:47:07.000Z',
                        currentRating: null,
                    },
                },
                {
                    player: {
                        pseudo: 'Aaaa',
                        publicId: '720b3d57-bccf-418e-a67a-9b785ea92e97',
                        isGuest: false,
                        isBot: false,
                        slug: 'aaaa',
                        createdAt: '2025-08-20T15:43:00.000Z',
                        currentRating: null,
                    },
                },
            ],
            state: 'ended',
            ranked: false,
            boardsize: 11,
            firstPlayer: null,
            swapRule: true,
            opponentType: 'ai',
            opponentPublicId: 'a45ce9f7-9167-46ad-9867-d35adc860037',
            timeControlType: {
                family: 'byoyomi',
                options: {
                    initialTime: 10000,
                    periodTime: 5000,
                    periodsCount: 3,
                },
            },
            timeControl: {
                state: 'over',
                currentPlayer: 1,
                players: [
                    {
                        totalRemainingTime: 15000,
                        remainingMainTime: 5000,
                        remainingPeriods: 2,
                    },
                    {
                        totalRemainingTime: 6768,
                        remainingMainTime: 1768,
                        remainingPeriods: 1,
                    },
                ],
            },
            chatMessages: [],
            movesHistory: [
                {
                    row: 1,
                    col: 9,
                    playedAt: '2025-08-21T09:53:30.525Z',
                },
                {
                    row: 6,
                    col: 7,
                    playedAt: '2025-08-21T09:53:35.024Z',
                },
                {
                    row: 7,
                    col: 5,
                    playedAt: '2025-08-21T09:53:38.029Z',
                },
                {
                    row: 3,
                    col: 4,
                    playedAt: '2025-08-21T09:53:42.418Z',
                },
                {
                    row: 5,
                    col: 6,
                    playedAt: '2025-08-21T09:53:45.433Z',
                },
                {
                    row: 6,
                    col: 3,
                    playedAt: '2025-08-21T09:53:54.479Z',
                },
                {
                    row: 4,
                    col: 6,
                    playedAt: '2025-08-21T09:53:57.488Z',
                },
                {
                    row: 2,
                    col: 8,
                    playedAt: '2025-08-21T09:54:00.897Z',
                },
                {
                    row: 2,
                    col: 7,
                    playedAt: '2025-08-21T09:54:03.904Z',
                },
                {
                    row: 3,
                    col: 8,
                    playedAt: '2025-08-21T09:54:08.401Z',
                },
                {
                    row: 9,
                    col: 4,
                    playedAt: '2025-08-21T09:54:11.407Z',
                },
            ],
            currentPlayerIndex: 1,
            winner: 0,
            outcome: 'resign',
            startedAt: '2025-08-21T09:53:27.513Z',
            lastMoveAt: '2025-08-21T09:54:11.407Z',
            endedAt: '2025-08-21T09:54:14.639Z',
            tournamentMatch: null,
            undoRequest: null,
            rematch: null,
            rematchedFrom: {
                publicId: '4f7b0ffb-6982-4d29-8736-18c9e07ad955',
                hostedGameToPlayers: [
                    {
                        player: {
                            pseudo: 'Aaaa',
                            publicId: '720b3d57-bccf-418e-a67a-9b785ea92e97',
                            isGuest: false,
                            isBot: false,
                            slug: 'aaaa',
                            createdAt: '2025-08-20T15:43:00.000Z',
                            currentRating: null,
                        },
                    },
                    {
                        player: {
                            pseudo: 'Davies 7',
                            publicId: 'a45ce9f7-9167-46ad-9867-d35adc860037',
                            isGuest: false,
                            isBot: true,
                            slug: 'davies-7',
                            createdAt: '2025-08-11T21:47:07.000Z',
                            currentRating: null,
                        },
                    },
                ],
                state: 'ended',
                timeControl: {
                    state: 'over',
                    currentPlayer: 0,
                    players: [
                        {
                            totalRemainingTime: 20439,
                            remainingMainTime: 5439,
                            remainingPeriods: 3,
                        },
                        {
                            totalRemainingTime: 24990,
                            remainingMainTime: 9990,
                            remainingPeriods: 3,
                        },
                    ],
                },
                ranked: false,
                boardsize: 11,
                firstPlayer: null,
                swapRule: true,
                opponentType: 'ai',
                opponentPublicId: 'a45ce9f7-9167-46ad-9867-d35adc860037',
                timeControlType: {
                    family: 'byoyomi',
                    options: {
                        initialTime: 10000,
                        periodTime: 5000,
                        periodsCount: 3,
                    },
                },
                tournamentMatch: null,
                undoRequest: null,
                rematch: null,
                rematchedFrom: null,
                createdAt: '2025-08-21T09:52:04.451Z',
            },
            createdAt: '2025-08-21T09:53:27.508Z',
            ratings: [],
        });

        assert.strictEqual(
            hostedGameToSGF(hostedGame),
            '(;FF[4]CA[UTF-8]AP[PlayHex:0.0.0]SO[PlayHex.org]PC[https://playhex.org/games/99efbf69-a506-4438-9c39-f3daeaf55d37]GM[11]SZ[11]PB[Davies 7]PW[Aaaa]DT[2025-08-21]HA[0]RE[B+Resign]TM[10]OT[3x5 byo-yomi];B[j2]BL[10]OB[3];W[h7]WL[6]OW[3];B[f8]BL[7]OB[3];W[e4]WL[2]OW[3];B[g6]BL[4]OB[3];W[d7]WL[5]OW[1];B[g5]BL[1]OB[3];W[i3]WL[5]OW[1];B[h3]BL[5]OB[2];W[i4]WL[5]OW[1];B[e10]BL[5]OB[2])',
        );
    });
});
