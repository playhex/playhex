const ejs = require('ejs');
const manifest = require('./dist/statics/manifest.json');
const fs = require('fs');

ejs
    .renderFile('views/page.ejs', {manifest})
    .then(html => fs.writeFile('./dist/statics/index.html', html, console.error))
;
