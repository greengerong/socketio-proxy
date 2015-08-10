function init() {

    var assessmentId = 123,
        socket = io.connect('http://127.0.0.1:8080', {
            port: 8080,
            rememberTransport: false
        });

    socket.on('communicate', function(data) {
        console.log('got data from node proxy ', data);
        $('#response').append('<p>Got message from server :<pre>' +
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
        socket.emit('communicate', {
            type: $('#type').val(),
            data: {
                message: $('#message').val(),
                assessmentId: assessmentId
            }
        });
    });

    socket.emit('joinRoom', {
        assessmentId: assessmentId
    });
}

$(document).on('ready', init);
