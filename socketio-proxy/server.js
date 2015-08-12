var util = require('util'),
    express = require("express"),
    app = express(),
    http = require("http").createServer(app),
    bodyParser = require("body-parser"),
    socketioProxy = require("./lib/socketioProxy");

app.set("ipaddr", process.env.ip || "127.0.0.1");
app.set("port", process.env.port || 8080);
if (process.env.setting && process.env.setting) {
    app.set("proxySetting", require(process.env.setting || {}));
}

app.use(bodyParser.json());


app.get("/", function(req, res) {
    res.redirect('/check');
});

socketioProxy(app, http);

http.listen(app.get("port"), app.get("ipaddr"), function() {
    console.log(util.format("Socketio proxy server up and running on: http://%s:%s", app.get("ipaddr"), app.get("port")));
});
