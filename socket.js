// include all the libraries we need as well as variables
require('bufferjs/add-chunk');
var http = require('http'),
    express = require('express'),
    app = express(),
    fs = require('fs'),
    server = http.createServer(app), // our server
    options = {
        host: "10.0.0.1",
        port: 60152,
        path: '/liveview.JPG?%211234%21http%2dget%3a%2a%3aimage%2fjpeg%3a%2a%21%21%21%21%21'
    }, // options for our Sony liveview
    parts, // image chunks buffer
    socketCleared = true,
    boundary = 'actioncam'; // monitor socket

// configure static folders
app.use("/js", express.static(__dirname + "/js"));
app.use("/css", express.static(__dirname + "/css"));

// set up routing
app.get('/', function (req, res) {
    if (req.url === "/") {
        startStream();
        fs.readFile(__dirname + '/index2.html',
            function (err, data) {
                if (err) {
                    res.writeHead(500);
                    return res.end('Error loading ' + __dirname + 'index2.html');
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

var startStream = function(){
    // stream the base64Image back to the res for the stream
//    res.writeHead(200, {
//        'Content-Type': 'multipart/x-mixed-replace;boundary=--' + boundary,
//        'Connection': 'keep-alive',
//        'Expires': 'Fri, 01 Jan 1990 00:00:00 GMT',
//        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
//        'Pragma': 'no-cache'
//    });

    // open a stream to the camera
    http.get(options, function (vidres) {

        // handle the data
        vidres.on('data', function (buf) {
            console.log(buf);
            // make sure this is the first chunk of the packet
            if (buf[0] == 0xff && buf[1] == 0x01) {

                // the image should be filled
                if (parts != null) {

                    // make sure we have an image to work with
                    if (parts.length > 0) {

                        // convert to base64Image
                        var base64Image = parts.toString('base64');
//                        res.write("\r\n");
//                        res.write('--' + boundary + '\r\n');
//                        res.write("Content-type: image/jpeg\r\n");
//                        res.write("Content-Length: " + parts.length + "\r\n");
//                        res.write("\r\n");
//                        res.write(base64Image);
                        //res.write('\n--' + boundary + '\n');
                        var stream = fs.createWriteStream("video/myvid.jpg");
                        stream.write(base64Image);
                    }

                } /* END if */

                // create the buffers we need
                var commonHeadBuf = buf.slice(0, 8);
                var payloadHeadBuf = buf.slice(8, 12);

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

                } /* END if */

            } else {

                // add the current packet to the image buffer
                parts.addChunk(buf);

            } /* END if */
        })
    })
}

// shift the bytes in the array
var byteArrayToLong = function ( /*byte[]*/ byteArray) {
    var value = 0;
    for (var i = byteArray.length - 1; i >= 0; i--) {
        value += (byteArray[i] << 8) | (byteArray[i] & 0xff);
    }
    return value;
};

// start the server
server.listen(8080);
