require('bufferjs/add-chunk');
var server = require('net').createServer(),
context = require('rabbit.js').createContext('amqp://localhost:5672'),
pub = context.socket('PUSH'),
sub = context.socket('WORKER');
var fs = require("fs");
var easyimg = require('easyimage');

pub.connect('post-processing');
sub.connect('pre-processing');

context.on('ready', function() {
    console.log("Server Connected");
    sub.on('data', function(buf){
        console.log("Got Data");
       // var base64Image = buf.toString('base64');
        fs.writeFile('test.png', buf, function(err) {
            if(err) throw err;
            console.log("Write PNG");
            sub.ack();
        });
        // pub.write(base64Image);
        // sub.ack();
    });
});
