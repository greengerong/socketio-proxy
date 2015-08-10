var express = require("express"),
    app = express(),
    http = require("http").createServer(app),
    bodyParser = require("body-parser");

app.set("ipaddr", "127.0.0.1");

app.set("port", 9090);

app.set("views", __dirname + "/views");

app.set("view engine", "jade");

app.use(express.static("public", __dirname + "/public"));

app.use(bodyParser.json());


app.get("/", function(req, res) {
    res.render("index");

});

////////////////////////////////////////////////////
//TODO: test post api;
var resRoom = 'room1';
app.post("/joinRoom", function(req, res) {
    console.log('In test server api joinRoom', req.body);
    res.send({
        room: req.body.data.assessmentId
    });
});

app.post("/recommandation", function(req, res) {
    console.log('In test server api recommandation', req.body);
    // res.status(500).send({
    //     error: 'Something blew up!'
    // });
    res.send({
        room: req.body.data.assessmentId,
        data: req.body.data
    });

});

app.post("/comment", function(req, res) {
    console.log('In test server api comment', req.body);
    res.send({
        room: req.body.data.assessmentId,
        data: req.body.data
    });
});

http.listen(app.get("port"), app.get("ipaddr"), function() {
    console.log("Socketio mock Server up and running. Go to http://" + app.get("ipaddr") + ":" + app.get("port"));
});
