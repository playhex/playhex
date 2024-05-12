import { Express, Request } from 'express';
import Container from 'typedi';
import { useContainer, useExpressServer } from 'routing-controllers';
import GameController from './GameController';
import PlayerController from './PlayerController';
import AuthController from './AuthController';
import OnlinePlayersController from './OnlinePlayersController';
import PlayerSettingsController from './PlayerSettingsController';
import AdminController from './AdminController';
import HttpError from '../HttpError';
import PlayerRepository from '../../../repositories/PlayerRepository';
import Player from '../../../../shared/app/models/Player';
import ChatController from './ChatController';
import AIConfigController from './AIConfigController';
import GameAnalyzeController from './GameAnalyzeController';
import { defaultInstanceToPlainOptions, defaultPlainToInstanceOptions } from '../../../../shared/app/class-transformer-custom';

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

            if (null === player) {
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

                if ('string' !== typeof ADMIN_PASSWORD || token !== ADMIN_PASSWORD) {
                    throw new HttpError(403, 'Invalid admin token');
                }

                return true;
            }

            return false;
        },
        controllers: [
            OnlinePlayersController,
            GameController,
            GameAnalyzeController,
            ChatController,
            PlayerController,
            AuthController,
            PlayerSettingsController,
            AdminController,
            AIConfigController,
        ],
    });

    // If an api endpoint has already been called, stop routing chain
    app.all('/**', (req, res, next) => {
        if (!res.headersSent) {
            next();
        }
    });

    app.all('/api/**', req => {
        throw new HttpError(404, `Route ${req.method} ${req.originalUrl} not found.`);
    });
};
