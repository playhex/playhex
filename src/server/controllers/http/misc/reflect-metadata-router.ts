import path from 'path';
import { Router } from 'express';

/**
 * Served as a plain classic <script> (see views/page.ejs), loaded before the module entry
 * script. reflect-metadata is CommonJS-only; bundling it as an ESM import in the client
 * build is unreliable because Rolldown wraps such bare side-effect imports in a lazy
 * factory whose call site ends up running *after* other static imports (e.g. the models
 * chunk, whose TypeORM/class-transformer decorators call Reflect.getMetadata at parse
 * time). Serving it unbundled guarantees Reflect is patched before any app code runs.
 */
export function reflectMetadataRouter(): Router {
    const router = Router();

    router.get('/statics/reflect-metadata.js', (_, res) => {
        res.sendFile(path.join(process.cwd(), 'node_modules', 'reflect-metadata', 'Reflect.js'));
    });

    return router;
}
