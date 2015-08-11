function init() {

    var room = window.location.search.match(/room=(\d+)/)[1] || 123,
        socket = io.connect('http://127.0.0.1:8080', {
            port: 8080,
            rememberTransport: false
        });

    socket.on('recommandation', function(data) {
        console.log('got recommandation from node proxy ', data);
        $('#response').append('<p>Got recommandation from server :<pre>' +
            JSON.stringify(data) +
            '</pre></p><hr/>');
    });

    socket.on('comment', function(data) {
        console.log('got comment data from node proxy ', data);
        $('#response').append('<p>Got comment from server :<pre>' +
            JSON.stringify(data) +
            '</pre></p><hr/>');
    });

    socket.on('error', function(reason) {
        console.log('Unable to connect to server', reason);
    });


    socket.on('communicate-error', function(reason) {
        console.log('server response error', reason);
    });

    $('#send').on('click', function() {
        socket.emit($('#type').val(), {
            message: $('#message').val(),
            room: room
        });
    });

    socket.emit('joinRoom', {
        room: room
    });
}

$(document).on('ready', init);
