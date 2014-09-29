var eb = require("vertx/event_bus"),
    vertx = require('vertx'),
    console = require('vertx/console'),
    container = require('vertx/container'),
    server = vertx.createHttpServer(),
    client = vertx.createHttpClient().port(60152).host("10.0.0.1"),
    vidPath = "/liveview.JPG?%211234%21http%2dget%3a%2a%3aimage%2fjpeg%3a%2a%21%21%21%21%21",
    parts = new vertx.Buffer(),
    frameCount = 0,
    fid = 0,
    framebuf = 0;

// create a connection to MongoDB
container.deployModule(
    'io.vertx~mod-mongo-persistor~2.0.0-final', {
        db_name: "actioncam"
    },
    1,
    function (err, deployId) {
        if (!err) {
            console.log("Deployed Mongo frames database");
        } else {
            console.log(err);
        }
    }
);


// Serve the index page
server.requestHandler(function (req) {
    if (req.uri() == "/") {
        req.response.sendFile("sockjs/index.html");
    } else {
        req.response.sendFile("sockjs/" + req.uri());
    }
});

vertx.createSockJSServer(server).bridge({
    prefix: "/eventbus"
}, [{}], [{}]);


client.getNow(vidPath, function (resp) {
    resp.dataHandler(function (buffer) {
        if (buffer.length() == 136) {
            fid = 0;
            //parts = new vertx.Buffer();
            if (framebuf == 2) {
                eb.send(
                    'vertx.mongopersistor', {
                        action: 'save',
                        collection: 'frames',
                        document: {
                            "name": "newFrame"
                        }
                    },
                    function (reply) {
                        frameCount = 0;
                        framebuf = 0;
                        console.log("FRAME: " + reply._id);
                        fid = reply._id;
                    }
                );
            }
            framebuf++;
        } else {
            if (fid != 0) {
                frameCount++;
                // save chunk for frame
                eb.send(
                    'vertx.mongopersistor', {
                        action: 'save',
                        collection: 'chunks',
                        document: {
                            "name": "chunk",
                            "cid": frameCount,
                            "fid": fid,
                            'data': buffer.toString()
                        }
                    },
                    function (reply) {
                        console.log("CHUNK: " + reply._id);
                    }
                );
            }
        }
    });
});

server.listen(8080);