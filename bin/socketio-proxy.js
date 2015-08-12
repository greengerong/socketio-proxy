#!/usr/bin/env node

'use strict';
var argv = process.argv.slice(2),
    setting = argv[0];

if (setting) {
    process.env.setting = setting;
}
require('../server');
