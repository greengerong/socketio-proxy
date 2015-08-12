var express = require("express"),
    app = express(),
    http = require("http").createServer(app),
    bodyParser = require("body-parser"),
    _ = require('lodash'),
    io = require("socket.io").listen(http, {
        // origins: '*:*'
    }),
    util = require('util'),
    fs = require('fs'),
    proxy = require('./proxy'),
    authentificationSockets = {}; // 这里的key（token），如果选择分离到第三方平台，则还可以获取到ngnix自由代理的多台、多进程扩展。

if (!fs.existsSync('.tmp')) {
    fs.mkdirSync('.tmp');
}

var log = require('bunyan').createLogger({
    name: 'socketio-proxy',
    streams: [{
        level: 'info',
        stream: process.stdout // log INFO and above to stdout
    }, {
        level: 'warn',
        path: '.tmp/socketio-proxy.log' // log ERROR and above to a file
    }]
});

app.set("ipaddr", process.env.ip || "127.0.0.1");
app.set("port", process.env.port || 8080);
if (process.env.setting && process.env.setting) {
    app.set("proxySetting", require(process.env.setting || {}));
}

app.use(bodyParser.json());


app.get("/", function(req, res) {
    res.send({
        name: 'socketio proxy',
        alive: true,
        script: util.format('%s://%s%ssocket.io/socket.io.js', req.protocol, req.get('Host'), req.url),
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
    app.post("/api/v1/notification", function(req, res, next) {
        if (notification.token && req.headers[notification.tokenName || 'proxy-token'] !== notification.token) {

            var getClientIp = function(req) {
                return req.headers['x-forwarded-for'] ||
                    req.connection.remoteAddress ||
                    req.socket.remoteAddress ||
                    req.connection.socket.remoteAddress;
            };
            log.error('Wrong notification from %s', getClientIp(req));
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
            message: util.format('Notify the client %s(%s) with: %s!', notify.room, notify.event, JSON.stringify(palyload.data))
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
        log.info(data, 'Got %s will ask server url %s', join.src, url);
        proxy(url, data, function(err, result) {
            if (err) {
                log.error(err, 'Proxy to server to join room error.');
                return socket.emit(join.src + '-error', {
                    success: false,
                    error: err
                });
            }
            var notify = result.notify;
            if (!notify.identity) {
                var msg = 'The server api didn\'t given identity to this socket!';
                log.info(notify, msg);
                return socket.emit(join.src + '-error', {
                    success: false,
                    error: msg
                });
            }

            authentificationSockets[notify.identity] = socket;

            if (notify.room) {
                socket.join(notify.room);
                log.info('User join room %s.', notify.room);
            }

            log.info('Join socket connection success.');
            socket.emit(join.src, {
                success: true,
                token: notify.identity
            });
        });

    });

    _.forEach(mapping, function(item) {
        item.target = item.target || item.src;
        var url = setting.baseUrl + item.target;
        log.info('Socket on event %s', item.src);
        socket.on(item.src, function(data) {

            var isAuthorize = _.chain(authentificationSockets).some(function(value, key) {
                return key === data.token;
            }).value();
            if (!isAuthorize) {
                var msg = 'You don\'t have authentification!';
                return socket.emit(item.src + '-error', {
                    success: false,
                    error: msg
                }, function() {
                    socket.disconnect();
                });
            }
            authentificationSockets[data.token] = socket;
            log.info(data, 'Got socket event %s to url %s.', item.src, url);

            proxy(url, data, function(err, result) {
                if (err) {
                    log.error(err, 'API service response error on %s event.', item.src);
                    return socket.emit(item.src + '-error', err);
                }

                var notify = result.notify;

                if (notify.identitys) {
                    _.chain(notify.identitys)
                        .forEach(function(identity) {
                            (authentificationSockets[identity] || {
                                emit: _.noop
                            }).emit(item.src, result.data);
                        }).value()

                    log.info(notify, 'Emit data to identitys %s', notify.identitys);
                }

                if (notify.room) {
                    io.to(notify.room).emit(item.src, result.data);
                    log.info(notify, 'Emit data to room ' + notify.room);
                }

                if ((!notify.identitys || !notify.identitys.lenth) && !notify.room) {
                    var msg = 'Success, but nothing to emit!';
                    return socket.emit(item.src, {
                        success: true,
                        message: msg
                    });
                }

                // return socket.emit(item.src, {
                //     success: true,
                //     message: 'Success!'
                // });
            });
        });
    })



    socket.on("disconnect", function() {
        var identity = _.chain(authentificationSockets)
            .findKey(function(value) {
                return value === socket;
            })
            .value();

        if (identity) {
            log.info('disconnect: identity %s.', identity);
            authentificationSockets[identity] = null;
        };
        log.info('disconnect: leave room');
        socket.leaveAll();
    });

    //settimeout remove identity is null;
    setTimeout(function() {

    }, (app.get("proxySetting") || {
        timeout: 30 * 1000
    }).timeout);

});

http.listen(app.get("port"), app.get("ipaddr"), function() {
    console.log(util.format("Socketio proxy server up and running on: http://%s:%s", app.get("ipaddr"), app.get("port")));
});
