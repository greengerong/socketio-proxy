var request = require('request');

var baseUrl = 'http://127.0.0.1:8080/';


function post(data, done) {
    request.post(baseUrl + data.type, {
        json: data
    }, function(err, res, body) {
        if (!err && res.statusCode != 200) {
            err = {
                statusCode: res.statusCode,
                data: body
            };
        }

        console.log('proxy response ', err, res.status, body);
        done(err, body);
    });
}

module.exports = post;
