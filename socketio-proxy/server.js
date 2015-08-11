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

app.use(bodyParser.json());


app.get("/", function(req, res) {
    res.send({
        name: 'socketio proxy',
        alive: true,
        script: req.protocol + '://' + req.get('Host') + req.url + "socket.io/socket.io.js",
        author: {
            name: 'greengerong',
            github: 'https://github.com/greengerong/',
            blog: 'http://www.greengerong.com/'
        }
    });
});

var setting = app.get("proxySetting") || {},
    notification = setting.notification || {};
if (notification.enable === true) {
    app.post("/api/vi/notification", function(req, res, next) {
        if (notification.token && req.headers[notification.tokenName || 'proxy-token'] !== notification.token) {

            var getClientIp = function(req) {
                return req.headers['x-forwarded-for'] ||
                    req.connection.remoteAddress ||
                    req.socket.remoteAddress ||
                    req.connection.socket.remoteAddress;
            };
            console.log('Wrong notification from ' + getClientIp(req));
            res.status(401).send({
                success: false,
                error: 'Wrong notification!'
            })
        }

        next();
    }, function(req, res) {
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
}

io.on("connection", function(socket) {
    var setting = app.get("proxySetting") || {},
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
            var notify = result.notify;
            if (!notify.room) {
                var msg = 'No room for this socket!';
                return socket.emit(join.src + '-error', {
                    success: false,
                    error: msg
                });
            }

            socket.join(notify.room);
            var msg = 'User join room ' + notify.room;
            console.log(msg);
            socket.emit(join.src, {
                success: true,
                room: notify.room
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

                var notify = result.notify;
                if (!notify.room) {
                    var msg = 'No room for to emit!';
                    return socket.emit(join.src + '-error', {
                        success: false,
                        error: msg
                    });
                }

                io.to(notify.room).emit(item.src, result.data);
                var msg = 'emit data to room ' + notify.room;
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
