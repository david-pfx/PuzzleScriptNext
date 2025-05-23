// Read a list of files from a text file and create a data file of their contents
// PS3>ls ..\demo -Name -Recurse -File >.\scripts_list.txt
// >ls ..\demo -Name -Recurse | Out-File -FilePath .\scripts_list.txt -Encoding utf8
// npm start

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
    try {
        const t = fs.readFileSync(`../demo/${f}`, 'utf8');
        return { name: f, text: t };
    } catch (e) {
        console.log(e);
        throw e;
    }
});
console.log(`writing ${data.length} files to resources/scripts_data.js`);
fs.writeFileSync('resources/scripts_data.js', 'var scripts_data = ' + JSON.stringify(data, null, 2));