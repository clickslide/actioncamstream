// include all the libraries we need as well as variables
require('bufferjs/add-chunk');
var http = require('http'),
    express = require('express'),
    app = express(),
    fs = require('fs'),
    request = require("request"),
    server = http.createServer(app), // our server 
    io = require('socket.io').listen(
        8080, {
            log: true
        }
    ), // our Socket.io websocket
    parts, // image chunks buffer
    socketCleared = true, // monitor socket
    bufferArray = [];

// configure App headers - TODO: use what's necessary
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    return next();
});

// configure static folders
app.use("/js", express.static(__dirname + "/js"));
app.use("/css", express.static(__dirname + "/css"));

// set up routing
app.get('/', function (req, res) {
    if (req.url === "/") {
        fs.readFile(__dirname + '/index3.html',
            function (err, data) {
                if (err) {
                    res.writeHead(500);
                    return res.end('Error loading ' + __dirname + 'index.html');
                }
                res.writeHead(200);
                res.end(data);
            });
    } else {
        fs.readFile(__dirname + req.url, function (err, data) {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading ' + req.url);
            }
            res.writeHead(200);
            res.end(data);
        });
    }
});
app.get('/motion.jpg', function (req, res) {
    var boundary = "--boundary";
    var options = {
        host: "10.0.0.1",
        port: 60152,
        method: 'GET',
        path: '/liveview.JPG?%211234%21http%2dget%3a%2a%3aimage%2fjpeg%3a%2a%21%21%21%21%21'
    }
    //console.log("Got Url: " + req.url);
    //res.writeHead("ContentType: image/jpeg");
    var vidreq = http.get(options, function (vidres) {
        // wait for data
        vidres.on('data', function (chunk) {
            if (chunk[0] == 0xff && chunk[1] == 0x01) {
                if (parts != null) {

                    // send the entire image back
                    if (parts.length > 0) {
                        res.write(parts);
                    }

                }
                var jpgSizeBuf = chunk.slice(12, 15);
                var jpgSize = byteArrayToLong(jpgSizeBuf);
            // typically this will be 0
                var paddingSize = byteArrayToLong(chunk.slice(16, 17));

                // create the new buffer to store the image
                parts = new Buffer(jpgSize+paddingSize);
            } else {
                parts.addChunk(chunk);
                //res.write(chunk);
            }
        });
        vidres.on('close', function () {
            res.end();
        });
    }).on('error', function (e) {
        // we got an error, return 500 error to client and log error
        console.log(e.message);
        res.writeHead(500);
        res.end();
    });
    vidreq.end();
});

io.sockets.on('connection', function (socket) {

    _gsock = socket; // set our global socket

    // open a stream to the camera
    http.get(options, function (res) {
        res.on('error', function (err) {
            console.log("RESPONSE ERROR FROM CAMERA");
        });
        // handle the data
        res.on('data', function (buf) {
            // simply add the buffer to our queue
            bufferArray.push(buf);
            //handleQueue(buf);
            io.sockets.emit("bufferpush", true);
            //io.sockets.emit("raw", buf);
        })
    });

    // verify delivery to drop frames if necessary
    socket.on('done', function (data) {
        handleQueue();
    });

    socket.on('disconnect', function () {
        console.log('Got disconnect!');
    });

});

// shift the bytes in the array
var byteArrayToLong = function ( /*byte[]*/ byteArray) {
    var value = 0;
    for (var i = byteArray.length - 1; i >= 0; i--) {
        value += (byteArray[i] << 8) | (byteArray[i] & 0xff);
    }
    return value;
};

// start the server
server.listen(8082);