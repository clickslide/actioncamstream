// include all the libraries we need as well as variables
require('bufferjs/add-chunk');
var http = require('http'),
    io = require('socket.io').listen(
        8080, {
            log: false
        }
    ), // our Socket.io websocket
    options = {
        host: "10.0.0.1",
        port: 60152,
        path: '/liveview.JPG?%211234%21http%2dget%3a%2a%3aimage%2fjpeg%3a%2a%21%21%21%21%21'
    }, // options for our Sony liveview
    parts, // image chunks buffer
    bufferArray = [];

var _gsock; // global socket holder
var processing = false; // flag for processing the queue
var httpReq;
// on connection, stream the video
io.sockets.on('connection', function (socket) {
    _gsock = socket; // set our global socket
    handleHttp();
    // verify delivery to drop frames if necessary
    socket.on('done', function (data) {
        // do something
    });
    socket.on('disconnect', function () {
        console.log('Got disconnect!');
    });
});

function handleHttp(){
    // open a stream to the camera
    httpReq = http.get(options, function (res) {
        res.on('error', function (err) {
            console.log("RESPONSE ERROR FROM CAMERA");
            console.log(err);
        });
        // handle the data
        res.on('data', function (buf) {
            // simply add the buffer to our queue
            bufferArray.push(buf);
            io.sockets.emit("bufferpush", true);
            handleQueue(buf);
            //io.sockets.emit("raw", buf);
        });
    });
}

var frameCount = 0;
var jpgSize = 0;
var handleQueue = function () {
    processing = true;
    httpReq.end();
    var buf = bufferArray.shift();
    if (buf !== undefined) {
        if (buf[0] == 0xff && buf[1] == 0x01) {
            if (parts !== null && parts !== undefined) {
                if(parts.length === jpgSize) {
                    var base64Image = parts.toString('base64');
                    io.sockets.emit('image', base64Image);
                }
            } /* END if */
            var jpgSizeBuf = buf.slice(12, 15);
            jpgSize = byteArrayToLong(jpgSizeBuf);
            parts = new Buffer(jpgSize);
        } else {
            parts.addChunk(buf);
        } /* END if */
    }
};
// shift the bytes in the array
var byteArrayToLong = function ( /*byte[]*/ byteArray) {
    var value = 0;
    for (var i = byteArray.length - 1; i >= 0; i--) {
        value += (byteArray[i] << 8) | (byteArray[i] & 0xff);
    }
    return value;
};
