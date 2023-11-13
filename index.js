/* eslint-disable no-undef */

const versionRequired = 18;
const [v, major] = process.version.match(/(\d+)\.\d+\.\d+/);

if (parseInt(major, 10) < versionRequired) {
    throw `Node >= ${versionRequired} required, actual version: ${v}.`;
}

require('./dist/server');
