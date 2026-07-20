import { AbstractPlay } from './handlers/AbstractPlay.js';
import { AbstractPlayJson } from './handlers/AbstractPlayJson.js';
import { HexWorldLink } from './handlers/HexWorldLink.js';
import { LittleGolemLink } from './handlers/LittleGolemLink.js';
import { LittleGolemSGF } from './handlers/LittleGolemSGF.js';
import { PlayHexLink } from './handlers/PlayHexLink.js';
import { RawMoves } from './handlers/RawMoves.js';
import { SGF } from './handlers/SGF.js';
import { HexGameImporter } from './HexGameImporter.js';
import { BackendFetchHexGameImporter } from './BackendFetchHexGameImporter.js';

/**
 * Can import Hex game from any source.
 * Client-side instance: delegates handlers that shouldFetchFromBackend() to the backend,
 * which does the actual fetch (see BackendFetchHexGameImporter.ts and the matching server instance).
 */
export const hexGameImporter = new HexGameImporter(
    [
        new LittleGolemLink(),
        new LittleGolemSGF(), // must come before SGF, whose supports() is a loose "(;" prefix check
        new SGF(),
        new AbstractPlay(),
        new AbstractPlayJson(),
        new PlayHexLink(),
        new RawMoves(), // RawMoves must come before HexWorldLink, whose supports() is loose
        new HexWorldLink(),
    ],
    new BackendFetchHexGameImporter(),
);
