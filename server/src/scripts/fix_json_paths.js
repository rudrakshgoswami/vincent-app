
import fs from 'fs';
import path from 'path';

const filePath = 'd:/vincentapp/server/src/scripts/catering_seed_data.json';
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/\/images\/Catering\//g, '/uploads/Catering/');
fs.writeFileSync(filePath, content);
console.log('Successfully updated image paths in JSON.');
