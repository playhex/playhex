/* eslint-disable no-undef */

const versionRequired = [18, 18, 2]; // on node 18.18, "import=ts-node/esm" has replaced "loader=ts-node/esm"
const [currentVersion, major, minor, patch] = process.version.match(/(\d+)\.(\d+)\.(\d+)/);

if (parseInt(major, 10) <= versionRequired[0]
    && parseInt(minor, 10) <= versionRequired[1]
    && parseInt(patch, 10) < versionRequired[2]
) {
    throw new Error(`Node >= ${versionRequired.join('.')} required, actual version: ${currentVersion}.`);
}

require('./dist/server');
