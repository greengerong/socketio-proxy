var request = require('request');


function post(url, data, done) {
    request.post(url, {
        json: data
    }, function(err, res, body) {
        if (!err && res.statusCode != 200) {
            err = {
                statusCode: res.statusCode,
                data: body
            };
        }

        done(err, body);
    });
}

module.exports = post;
