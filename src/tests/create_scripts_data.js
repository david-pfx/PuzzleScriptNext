// Read a list of files from a text file and create a data file of their contents

// Import necessary modules
const fs = require('fs');

const limit = 1000000;

// Read the list of files
const files = fs.readFileSync('scripts_list.txt', 'utf8')
    .split('\n')
    .map(f => f.trim())
    .filter(f => !['README', 'blank.txt', ''].includes(f))
    .slice(0, limit);
const data = files.map(f => {
    console.log(f);
    const t = fs.readFileSync(`../demo/${f}`, 'utf8');
    return { name: f, text: t };
});
console.log(`writing ${data.length} files to resources/scripts_data.js`);
fs.writeFileSync('resources/scripts_data.js', 'var scripts_data = ' + JSON.stringify(data, null, 2));