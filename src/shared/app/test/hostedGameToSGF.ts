import assert from 'assert';
import { HostedGame } from '../models/index.js';
import { plainToInstance } from '../class-transformer-custom.js';
import { hostedGameToSGF } from '../hostedGameToSGF.js';

describe('hostedGameToSGF', () => {
    it('generates SGF from an HostedGame instance', () => {
        const hostedGame: HostedGame = plainToInstance(HostedGame, {
            gameData: {
                movesHistory: [
                    {
                        row: 1,
                        col: 0,
                        playedAt: '2024-08-27T20:11:56.396Z',
                    },
                    {
                        row: -1,
                        col: -1,
                        specialMoveType: 'swap-pieces',
                        playedAt: '2024-08-27T20:11:57.428Z',
                    },
                    {
                        row: 4,
                        col: 10,
                        playedAt: '2024-08-27T20:11:58.432Z',
                    },
                    {
                        row: 5,
                        col: 5,
                        playedAt: '2024-08-27T20:11:58.951Z',
                    },
                    {
                        row: 2,
                        col: 4,
                        playedAt: '2024-08-27T20:11:59.954Z',
                    },
                ],
                winner: 0,
                outcome: 'resign',
                startedAt: '2024-08-27T20:11:55.394Z',
                lastMoveAt: '2024-08-27T20:11:59.954Z',
                endedAt: '2024-08-27T20:12:01.162Z',
                size: 11,
                allowSwap: true,
                currentPlayerIndex: 1,
            },
            undoRequest: null,
            rematch: null,
            rematchedFrom: null,
            createdAt: '2024-08-27T20:11:55.390Z',
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
            gameOptions: {
                ranked: false,
                boardsize: 11,
                firstPlayer: 1,
                swapRule: true,
                opponentType: 'ai',
                opponentPublicId: '53ccc84c-c73b-40b2-9ee2-21ca2182ac85',
                timeControl: {
                    family: 'fischer',
                    options: {
                        initialTime: 600000,
                        timeIncrement: 5000,
                        maxTime: 600000,
                    },
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
            '(;FF[4]CA[UTF-8]AP[PlayHex:0.0.0]SO[PlayHex.org]PC[https://playhex.org/games/b9113964-070b-4b7a-84c1-a7b590261ec7]GM[11]SZ[11]PB[Random bot]PW[aaa]DT[2024-08-27]HA[0]RE[B+Resign];B[a2];W[swap-pieces];B[k5];W[f6];B[e3])',
        );
    });

    it('generates SGF from a game that lasted multiple days', () => {
        const hostedGame: HostedGame = plainToInstance(HostedGame, {
            gameData: {
                movesHistory: [
                    {
                        row: 1,
                        col: 0,
                        playedAt: '2024-08-27T20:11:56.396Z',
                    },
                    {
                        row: -1,
                        col: -1,
                        specialMoveType: 'swap-pieces',
                        playedAt: '2024-08-27T20:11:57.428Z',
                    },
                    {
                        row: 4,
                        col: 10,
                        playedAt: '2024-08-27T20:11:58.432Z',
                    },
                    {
                        row: 5,
                        col: 5,
                        playedAt: '2024-08-27T20:11:58.951Z',
                    },
                    {
                        row: 2,
                        col: 4,
                        playedAt: '2024-08-28T20:11:59.954Z',
                    },
                ],
                winner: 0,
                outcome: 'resign',
                startedAt: '2024-08-27T20:11:55.394Z',
                lastMoveAt: '2024-08-27T20:11:59.954Z',
                endedAt: '2024-08-27T20:12:01.162Z',
                size: 11,
                allowSwap: true,
                currentPlayerIndex: 1,
            },
            undoRequest: null,
            rematch: null,
            rematchedFrom: null,
            createdAt: '2024-08-27T20:11:55.390Z',
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
            gameOptions: {
                ranked: false,
                boardsize: 11,
                firstPlayer: 1,
                swapRule: true,
                opponentType: 'ai',
                opponentPublicId: '53ccc84c-c73b-40b2-9ee2-21ca2182ac85',
                timeControl: {
                    family: 'fischer',
                    options: {
                        initialTime: 600000,
                        timeIncrement: 5000,
                        maxTime: 600000,
                    },
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
            '(;FF[4]CA[UTF-8]AP[PlayHex:0.0.0]SO[PlayHex.org]PC[https://playhex.org/games/b9113964-070b-4b7a-84c1-a7b590261ec7]GM[11]SZ[11]PB[Random bot]PW[aaa]DT[2024-08-27]HA[0]RE[B+Resign];B[a2];W[swap-pieces];B[k5];W[f6];B[e3])',
        );
    });
});
