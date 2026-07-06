import { Express, Request } from 'express';
import { Container } from 'typedi';
import { HttpError, useContainer, useExpressServer } from 'routing-controllers';
import GameController from './GameController.js';
import PlayerController from './PlayerController.js';
import PlayerNotificationController from './PlayerNotificationController.js';
import AuthController from './AuthController.js';
import OnlinePlayersController from './OnlinePlayersController.js';
import PlayerFavoriteTimeControlController from './PlayerFavoriteTimeControlController.js';
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
import AdminModerationController from './AdminModerationController.js';
import PlayerModerationController from './PlayerModerationController.js';
import PlayerAvatarController from './PlayerAvatarController.js';
import PlayerCountryFlagController from './PlayerCountryFlagController.js';
import { checkAuthorization } from '../../../services/roles.js';
import ChannelController from './ChannelController.js';
import ChangelogController from './ChangelogController.js';
import HexplorerController from './HexplorerController.js';
import HexGameImporterController from './HexGameImporterController.js';

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
        authorizationChecker: async (action, roles): Promise<boolean> => {
            const request = action.request as Request;

            return checkAuthorization(request.get('Authorization'), roles, request.ip);
        },
        controllers: [
            OnlinePlayersController,
            GameController,
            GameConditionalMovesController,
            GameAnalyzeController,
            TournamentController,
            TournamentBanController,
            ChatController,
            ChannelController,
            PlayerController,
            PlayerNotificationController,
            AuthController,
            PlayerSettingsController,
            PlayerFavoriteTimeControlController,
            AdminController,
            AdminModerationController,
            PlayerModerationController,
            PlayerAvatarController,
            PlayerCountryFlagController,
            AIConfigController,
            PushController,
            RatingController,
            SearchController,
            ServerInfoController,
            ChangelogController,
            HexplorerController,
            HexGameImporterController,
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
