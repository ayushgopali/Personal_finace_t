// Test change
const path = require('path');

const appDir = path.join(__dirname, 'expence-tracker');
process.chdir(appDir);

require(path.join(appDir, 'server.js'));