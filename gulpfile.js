const ngrok = require('ngrok');
const config = require('./gulp.config');
const log = require('fancy-log');
const fs = require('fs');
const path = require('path');
const nodemon = require('nodemon');

// Gulp Base
const {
    src,
    dest,
    watch,
    series,
    parallel,
    lastRun,
    task
} = require('gulp');

require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';
const isDev = process.env.NODE_ENV === 'dev';




task('start-ngrok', (cb) => {
    log("[NGROK] starting ngrok...");
    let conf = {
        subdomain: process.env.NGROK_SUBDOMAIN,
        region: process.env.NGROK_REGION,
        addr: process.env.PORT,
        authtoken: process.env.NGROK_AUTH
    };


    ngrok.connect(conf).then((url) => {
        log('[NGROK] Url: ' + url);
        if (!conf.authtoken) {
            log("[NGROK] You have been assigned a random ngrok URL that will only be available for this session. You wil need to re-upload the Teams manifest next time you run this command.");
        }
        let hostName = url.replace('http://', '');
        hostName = hostName.replace('https://', '');

        log('[NGROK] HOSTNAME: ' + hostName);
        process.env.HOSTNAME = hostName

        cb();

    }).catch((err) => {
        log.error(`[NGROK] Error: ${JSON.stringify(err)}`);
        cb(err.msg);
    });
});

task('nodemon', (callback) => {
    var started = false;

    return nodemon({
        script: './index.js',
        //watch: ['./index.js'],
        //nodeArgs: isDev ? ['--inspect'] : []
    }).on('start', function () {
        if (!started) {
            callback();
            started = true;
            log('HOSTNAME: ' + process.env.HOSTNAME);
        }
    });
});

task('ngrok', series('start-ngrok',  'nodemon'));