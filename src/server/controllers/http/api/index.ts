import { Express, Request } from 'express';
import { Container } from 'typedi';
import { HttpError, useContainer, useExpressServer } from 'routing-controllers';
import GameController from './GameController.js';
import PlayerController from './PlayerController.js';
import AuthController from './AuthController.js';
import OnlinePlayersController from './OnlinePlayersController.js';
import PlayerSettingsController from './PlayerSettingsController.js';
import AdminController from './AdminController.js';
import PlayerRepository from '../../../repositories/PlayerRepository.js';
import { Player } from '../../../../shared/app/models/index.js';
import ChatController from './ChatController.js';
import AIConfigController from './AIConfigController.js';
import GameAnalyzeController from './GameAnalyzeController.js';
import RatingController from './RatingController.js';
import { defaultInstanceToPlainOptions, defaultPlainToInstanceOptions } from '../../../../shared/app/class-transformer-custom.js';
import ServerInfoController from './ServerInfoController.js';
import SearchController from './SearchController.js';
import GameConditionalMovesController from './GameConditionalMovesController.js';
import PushController from './PushController.js';
import TournamentController from './TournamentController.js';
import TournamentBanController from './TournamentBanController.js';

export const registerApi = (app: Express) => {

    useContainer(Container);
    useExpressServer(app, {
        defaultErrorHandler: false,
        classTransformer: true,
        classToPlainTransformOptions: defaultInstanceToPlainOptions,
        plainToClassTransformOptions: defaultPlainToInstanceOptions,
        validation: {
            whitelist: true,
            forbidNonWhitelisted: true,
        },
        defaults: {
            undefinedResultCode: 204,
        },
        currentUserChecker: async (action): Promise<null | Player> => {
            const { playerId } = action.request.session;

            if (!playerId) {
                return null;
            }

            const player = await Container.get(PlayerRepository).getPlayer(playerId);

            if (player === null) {
                return null;
            }

            return player;
        },
        authorizationChecker: (action, roles): boolean => {
            if (roles.includes('ADMIN')) {
                const authorization = (action.request as Request).get('Authorization');

                if (undefined === authorization || !authorization.startsWith('Bearer ')) {
                    throw new HttpError(403, 'Restricted admin area. Add header Authorization: Bearer xxx');
                }

                const { ADMIN_PASSWORD } = process.env;
                const token = authorization.substring('Bearer '.length);

                if (typeof ADMIN_PASSWORD !== 'string' || token !== ADMIN_PASSWORD) {
                    throw new HttpError(403, 'Invalid admin token');
                }

                return true;
            }

            return false;
        },
        controllers: [
            OnlinePlayersController,
            GameController,
            GameConditionalMovesController,
            GameAnalyzeController,
            TournamentController,
            TournamentBanController,
            ChatController,
            PlayerController,
            AuthController,
            PlayerSettingsController,
            AdminController,
            AIConfigController,
            PushController,
            RatingController,
            SearchController,
            ServerInfoController,
        ],
    });

    // If an api endpoint has already been called, stop routing chain
    app.all('/{*path}', (_, res, next) => {
        if (!res.headersSent) {
            next();
        }
    });

    app.all('/api/{*path}', req => {
        throw new HttpError(404, `Route ${req.method} ${req.originalUrl} not found.`);
    });
};
