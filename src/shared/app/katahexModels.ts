export type KatahexModel = {
    filename: string;
    version: string;
    description: string;
    size: string;
    network: string;
    elo?: string;
    recommended?: boolean;
    special?: boolean;
    originUrl: string;
    releaseUrl?: string;
};

export const katahexModels: KatahexModel[] = [
    {
        filename: 'hex27x3.bin.gz',
        version: '2024-08-12',
        description: 'Best choice: strongest model for its weight.',
        size: '93 MB',
        network: 'b18c384nbt',
        elo: '+263 elo vs 2022 on 19x19 (+268 on 15x15, +466 on 25x25)',
        recommended: true,
        originUrl: 'https://drive.usercontent.google.com/download?id=1YeqRvAYs7YjtPh0xBbDnHxeo2xrLEOdX',
        releaseUrl: 'https://github.com/hzyhhzy/KataGomo_fork/releases/tag/Hex_20240812',
    },
    {
        filename: 'hex3_27x_b28.bin.gz',
        version: '2025-01-31',
        description: 'Heaviest, strongest model.',
        size: '270 MB',
        network: 'b28c512nbt',
        elo: '+200 elo vs 2024 on 19x19 (+100 on 15x15)',
        originUrl: 'https://github.com/hzyhhzy/KataGomo/releases/download/Hex_20250131/hex3_27x_b28.bin.gz',
        releaseUrl: 'https://github.com/hzyhhzy/KataGomo/releases/tag/Hex_20250131',
    },
    {
        filename: 'katahex_model_20220618.bin.gz',
        version: '2022-06-18',
        description: 'Good, but heavier and weaker than 2024.',
        size: '173 MB',
        network: 'b40c256',
        originUrl: 'https://drive.usercontent.google.com/download?id=1xMvP_75xgo0271nQbmlAJ40rvpKiFTgP',
    },
    {
        filename: 'hex3_mm19x_b28.bin.gz',
        version: '2025-01-31',
        description: 'Supports move limit mode, but slightly weaker.',
        size: '270 MB',
        network: 'b28c512nbt',
        special: true,
        originUrl: 'https://github.com/hzyhhzy/KataGomo/releases/download/Hex_20250131/hex3_mm19x_b28.bin.gz',
        releaseUrl: 'https://github.com/hzyhhzy/KataGomo/releases/tag/Hex_20250131',
    },
];
