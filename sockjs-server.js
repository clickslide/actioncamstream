// include all the libraries we need as well as variables
require('bufferjs/add-chunk');
var http = require('http'),
    express = require('express'),
    app = express(),
    fs = require('fs'),
    request = require("request"),
    server = http.createServer(app), // our server
    sockjs = require('sockjs'), // our Socket.io websocket
    options = {
        host: "10.0.0.1",
        port: 60152,
        path: '/liveview.JPG?%211234%21http%2dget%3a%2a%3aimage%2fjpeg%3a%2a%21%21%21%21%21'
    }, // options for our Sony liveview
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
        fs.readFile(__dirname + '/index.html',
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

var _gsock; // global socket holder
var processing = false; // flag for processing the queue

// on connection, stream the video
var streamer = sockjs.createServer();
streamer.on('connection', function (socket) {
    // open a stream to the camera
//    http.get(options, function (res) {
//        console.log("got http");
//        res.on('error', function (err) {
//            console.log("RESPONSE ERROR FROM CAMERA");
//        });
//        // handle the data
//        res.on('data', function (buf) {
//            // simply add the buffer to our queue
//            console.log(buf);
//            bufferArray.push(buf);
//        })
//    });
socket.write({bufferpush:true});
    // verify delivery to drop frames if necessary
//    socket.on('done', function (data) {
//        handleQueue();
//    });
//
//    socket.on('disconnect', function () {
//        console.log('Got disconnect!');
//    });

});

var handleQueue = function () {
    processing = true;
    var buf = bufferArray.shift();
    if (buf != undefined) {
        // make sure this is the first chunk of the packet
        if (buf[0] == 0xff && buf[1] == 0x01) {

            // the image should be filled 
            if (parts != null) {

                // make sure we have an image to work with
                if (parts.length > 0) {

                    // convert to base64Image
                    var base64Image = parts.toString('base64');
                    // send image to view
                    io.sockets.emit('image', base64Image);

                }

            } /* END if */

            // create the buffers we need
            var commonHeadBuf = buf.slice(0, 8);
            var payloadHeadBuf = buf.slice(8, 12);
            console.log(payloadHeadBuf[0] == 0x24);
            // extract the JPG data from the Common Header
            if (
                payloadHeadBuf[0] == 0x24 && payloadHeadBuf[1] == 0x35 && payloadHeadBuf[2] == 0x68 && payloadHeadBuf[3] == 0x79
            ) {
                // extract the image data based on Liveview packet
                var jpgSizeBuf = buf.slice(12, 15);
                var jpgSize = byteArrayToLong(jpgSizeBuf);
                var paddingSize = byteArrayToLong(buf.slice(16, 17));

                // create the new buffer to store the image
                parts = new Buffer(jpgSize);
                handleQueue(); // restart at next chunk
            } /* END if */

        } else {
            // add the current packet to the image buffer
            parts.addChunk(buf);
            handleQueue(); // move to the next chunk
        } /* END if */
    }
}

// shift the bytes in the array
var byteArrayToLong = function ( /*byte[]*/ byteArray) {
    var value = 0;
    for (var i = byteArray.length - 1; i >= 0; i--) {
        value += (byteArray[i] << 8) | (byteArray[i] & 0xff);
    }
    return value;
};

streamer.installHandlers(server, {prefix:'/streamer'});
// start the server
server.listen(8080);