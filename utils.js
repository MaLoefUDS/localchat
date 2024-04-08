const fs = require('fs');
const os = require('os');

// Read the content of a file
const readFile = function (path, encoding = 'utf8') {
    return fs.readFileSync(path, encoding);
}
exports.readFile = readFile;

// Read the content of a JSON file
const readJSON = function (path) {
    return JSON.parse(readFile(path));
}
exports.readJSON = readJSON;

// Write content to a file
const writeFile = function (path, content) {
    fs.writeFileSync(path, content);
}
exports.writeFile = writeFile;

// Write content to a JSON file
const writeJSON = function (path, content) {
    writeFile(path, JSON.stringify(content));
}
exports.writeJSON = writeJSON;

// Move a file
const moveFile = function (source, target) {
    fs.renameSync(source, target);
}
exports.moveFile = moveFile;

// Obtain the local IP address of the server
const getLocalIP = function () {
    const networkInterfaces = os.networkInterfaces();
    for (let interfaceName in networkInterfaces) {
        const iface = networkInterfaces[interfaceName].filter((iface) => {
            return iface.family === 'IPv4' && !iface.internal;
        });
        if (iface.length === 0) {
            continue;
        }
        return iface[0].address;
    }
    console.error('No network interfaces found');
    stop();
}
exports.getLocalIP = getLocalIP;

