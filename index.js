const versionRequired = [18, 18, 2]; // on node 18.18, "import=ts-node/esm" has replaced "loader=ts-node/esm"
const [currentVersion, major, minor, patch] = process.version.match(/(\d+)\.(\d+)\.(\d+)/);

if (parseInt(major, 10) <= versionRequired[0]
    && parseInt(minor, 10) <= versionRequired[1]
    && parseInt(patch, 10) < versionRequired[2]
) {
    // eslint-disable-next-line no-console
    console.error(`Node >= ${versionRequired.join('.')} required, actual version: ${currentVersion}.`);
}

import './dist/server/index.js';
