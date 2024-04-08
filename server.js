
const WebSocket = require('ws');
const http = require('http');
const querystring = require('querystring');
const formidable = require('formidable');

const uuid = require('uuid');
const utils = require ('./utils.js');

const ip = utils.getLocalIP();
const port = 3000;

// Defien how to handle HTTP requests
const requestListener = async function (req, res) {

    // Handle POST requests
    if (req.method === 'POST') {

        // Parse form data
        const form = formidable.formidable({});

        form.options.allowEmptyFiles = true;
        form.options.minFileSize = 0;

        let fields;
        let files;
        try {
            [fields, files] = await form.parse(req);
        } catch (err) {
            console.error(err);
            return;
        }

        let author = fields.author[0].trim();
        let content = fields.message[0].trim();
        let fileId = "";

        // Save file to /files
        if (files.image && files.image.length > 0) {
            fileId = uuid.v4();
            let image = files.image[0];
            let tempPath = image.filepath;
            let targetPath = './files/' + fileId;
            utils.moveFile(tempPath, targetPath);
        }

        // Constuct message JSON object
        let message = {
            author: author,
            content: content,
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sender: req.connection.remoteAddress,
            fileId: fileId,
            selection: fields.selection[0]
        };

        // Persist message to storage and serve to clients
        updateMessages(message);

        res.writeHead(200);
        res.end();
    }

    // Handle GET requests
    else {

        // Serve GET requests
        res.writeHead(200);

        // Images and assets
        if (req.url.startsWith('/files/') || req.url.startsWith('/assets/')) {
            res.write(utils.readFile('.' + req.url, 'binary'), 'binary');
        }

        // Fonts
        else if (req.url === '/fonts/') {
            res.write(utils.readFile('.' + req.url));
        }

        // CSS
        else if (req.url === '/style.css') {
            res.write(utils.readFile('style.css'));
        }

        // JS
        else if (req.url === '/client.js') {
            res.write(utils.readFile('client.js').replace('HOST', `"ws://${ip}:${port}"`));
        }

        // HTML
        else if (req.url.startsWith('/chat')) {
            res.write(utils.readFile('site.html'));
        }

        res.end();
    }
};

// Message handling
try {
    messages = utils.readJSON('messages.json');
} catch (err) {
    messages = [];
}

const updateMessages = function (message) {
    messages.push(message);
    utils.writeJSON('messages.json', messages);
    broadcastData(JSON.stringify([message]));
};

// Construct server
const server = http.createServer(requestListener);
const wss = new WebSocket.Server({ server });

// Initially send out all messages to client
wss.on('connection', function (ws) {
    let messagesCopy = messages.slice();
    for (let message of messagesCopy) {
        message['self'] = ws._socket.remoteAddress.toString() === message.sender;
    }
    ws.send(JSON.stringify(messagesCopy));
});

const broadcastData = function (data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            let dataCopy = JSON.parse(data);
            let remote = client._socket.remoteAddress.toString();
            for (let message of dataCopy) {
                if (remote === message.sender) {
                    message['self'] = true;
                } else {
                    message['self'] = false;
                }
            }
            client.send(JSON.stringify(dataCopy));
        }
    });
};

server.listen(port, ip);
console.log(`Read chat at http://${ip}:${port}/chat`);
