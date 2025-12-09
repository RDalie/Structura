import fs from 'fs';
const path = require('path');

function main() {
  console.log('hello');
  return fs.readFileSync(path.join(__dirname, 'file.txt'), 'utf8');
}

module.exports = { main };
