import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import fs from 'fs';

const code = fs.readFileSync('./broken.js', 'utf8');

const parser = new Parser();
parser.setLanguage(JavaScript);

const tree = parser.parse(code);

console.log(tree.rootNode.toString());
