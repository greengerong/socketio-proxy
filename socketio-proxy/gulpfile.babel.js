import gulp from 'gulp';
import nodemon from 'gulp-nodemon';

'use strict';

gulp.task('proxyServer', (cb) => {
    var started = false;
    return nodemon({
        script: './server.js'
    }).on('start', function() {
        // to avoid nodemon being started multiple times
        // thanks @matthisk
        if (!started) {
            cb();
            started = true;
        }
    });

});

gulp.task('default', ['proxyServer'], () => {});
