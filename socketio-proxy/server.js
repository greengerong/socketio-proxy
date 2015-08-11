var express = require("express"),
    app = express(),
    http = require("http").createServer(app),
    bodyParser = require("body-parser"),
    _ = require('lodash'),
    fs = require('fs'),
    io = require("socket.io").listen(http, {
        // origins: '*:*'
    }),
    proxy = require('./proxy');

app.set("ipaddr", process.env.ip || "127.0.0.1");
app.set("port", process.env.port || 8080);
if (process.env.setting && process.env.setting) {
    // var settingJson = fs.readFileSync(process.env.setting, "utf8");
    // app.set("proxySetting", JSON.parse(settingJson) || {});
    app.set("proxySetting", require(process.env.setting || {}));
}

app.set("views", __dirname + "/views");
app.set("view engine", "jade");
app.use(bodyParser.json());


app.get("/", function(req, res) {
    res.render("index");
});

app.post("/api/vi/notification", function(req, res) {
    /* {
         notify: {
             room: '123',
             event: 'update-message'
         },
         data: {
             // some data  to notify client
         }
     }*/
    var palyload = req.body,
        notify = palyload.notify;
    if (!notify.room || !notify.event) {
        return res.status(400).send({
            success: false,
            message: 'Should given notify client and event name!'
        });
    }

    io.to(notify.room).emit(notify.event, palyload.data);
    res.send({
        success: true,
        message: 'Notify the client ' + notify.room + ' (' + notify.event + ') with :' + JSON.stringify(palyload.data) + '!'
    });
});

io.on("connection", function(socket) {
    var setting = app.set("proxySetting"),
        join = setting.join || {
            src: 'join'
        },
        mapping = setting.mapping || [];

    join.target = join.target || join.src;

    socket.on(join.src, function(data) {

        var url = setting.baseUrl + join.target;
        console.log('Got ' + join.src + ' will ask server url ' + url, data);
        proxy(url, data, function(err, result) {
            if (err) {
                console.log('Proxy to server to join room error:', err);
                return socket.emit(join.src + '-error', {
                    success: false,
                    error: err
                });
            }

            if (!result.room) {
                var msg = 'No room for this socket!';
                return socket.emit(join.src + '-error', {
                    success: false,
                    error: msg
                });
            }

            socket.join(result.room);
            var msg = 'User join room ' + result.room;
            console.log(msg);
            socket.emit(join.src, {
                success: true,
                room: result.room
            });
        });

    });

    _.forEach(mapping, function(item) {
        item.target = item.target || item.src;
        var url = setting.baseUrl + item.target;
        console.log('Socket on event ' + item.src);
        socket.on(item.src, function(data) {
            console.log('Got socket event ' + item.src + ' to url ' + url, data);

            proxy(url, data, function(err, result) {
                if (err) {
                    console.log('Proxy to server error:', err);
                    return socket.emit(item.src + '-error', err);
                }


                if (!result.room) {
                    var msg = 'No room for to emit!';
                    return socket.emit(join.src + '-error', {
                        success: false,
                        error: msg
                    });
                }

                io.to(result.room).emit(item.src, result.data);
                var msg = 'emit data to room ' + result.room;
                console.log(msg);
                socket.emit(join.src, {
                    success: true,
                    message: msg
                });
            });
        });
    })



    socket.on("disconnect", function(data) {
        console.log('disconnect: lave room', data);
        socket.leaveAll();
    });

});

http.listen(app.get("port"), app.get("ipaddr"), function() {
    console.log("Socketio proxy server up and running on: http://" + app.get("ipaddr") + ":" + app.get("port"));
});
