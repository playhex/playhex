import { AbstractPlay } from '../../shared/app/hex-game-importer/handlers/AbstractPlay.js';
import { AbstractPlayJson } from '../../shared/app/hex-game-importer/handlers/AbstractPlayJson.js';
import { HexWorldLink } from '../../shared/app/hex-game-importer/handlers/HexWorldLink.js';
import { LittleGolemSGF } from '../../shared/app/hex-game-importer/handlers/LittleGolemSGF.js';
import { PlayHexLink } from '../../shared/app/hex-game-importer/handlers/PlayHexLink.js';
import { RawMoves } from '../../shared/app/hex-game-importer/handlers/RawMoves.js';
import { SGF } from '../../shared/app/hex-game-importer/handlers/SGF.js';
import { HexGameImporter } from '../../shared/app/hex-game-importer/HexGameImporter.js';

const apiBaseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

/**
 * Server-side instance: no customFetchStrategy, handlers do the fetch themselves directly
 * (e.g PlayHexLink calls its own /api/games/:publicId endpoint with an absolute url).
 * Used to actually do the import on behalf of the client, when client-side handler
 * has shouldFetchFromBackend() === true (see BackendFetchHexGameImporter.ts).
 */
export const hexGameImporter = new HexGameImporter([
    new LittleGolemSGF(), // must come before SGF, whose supports() is a loose "(;" prefix check
    new SGF(),
    new AbstractPlay(),
    new AbstractPlayJson(),
    new PlayHexLink(apiBaseUrl),
    new RawMoves(),
    new HexWorldLink(),
]);
