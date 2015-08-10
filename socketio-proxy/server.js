var express = require("express"),
    app = express(),
    http = require("http").createServer(app),
    bodyParser = require("body-parser"),
    io = require("socket.io").listen(http, {
        // origins: '*:*'
    }),
    proxy = require('./proxy');

app.set("ipaddr", "127.0.0.1");
app.set("port", 8080);
app.set("views", __dirname + "/views");
app.set("view engine", "jade");
app.use(bodyParser.json());

// app.use(function(req, res, next) {
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Headers", "X-Requested-With");
//     res.header("Access-Control-Allow-Headers", "Content-Type");
//     res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
//     next();
// });


app.get("/", function(req, res) {
    res.render("index");
});

io.on("connection", function(socket) {

    socket.on("joinRoom", function(data) {
        console.log('join room', data);
        proxy({
            type: 'joinRoom',
            data: data
        }, function(err, result) {
            if (err) {
                console.log('proxy to server error:', err);
                return socket.emit('communicate-error', err);
            }

            if (result.room) {
                socket.join(result.room);
                console.log('user join room' + result.room);
            }
        });

    });


    socket.on("communicate", function(data) {
        console.log('communicate message', data);

        proxy(data, function(err, result) {
            if (err) {
                console.log('proxy to server error:', err);
                return socket.emit('communicate-error', err);
            }

            if (result.room) {
                io.to(result.room).emit("communicate", result.data);
                console.log('emit data to room ' + result.room, result.data);
            }
        });
    });


    socket.on("disconnect", function(data) {
        console.log('disconnect: lave room', data);
        socket.leaveAll();
    });

});

http.listen(app.get("port"), app.get("ipaddr"), function() {
    console.log("Socketio proxy server up and running on: http://" + app.get("ipaddr") + ":" + app.get("port"));
});
