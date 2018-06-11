#! /usr/bin/env node
let { ip, config } = require('../src/config')
let yargs = require('yargs')
let opn = require('opn')

let argv = yargs.option('port', {
    alias: 'p',
    default: config.port,
    demand: false,
    description: 'this is port'
}).option('hostname', {
    alias: 'h',
    default: ip,
    type: String,
    demand: false,
    description: 'this is hostname'
}).option('dir', {
    alias: 'd',
    default: process.cwd(),
    type: String,
    demand: false,
    description: 'this is directory'
}).usage('go-server [options]').argv

let Server = require('../src/app')
new Server(argv).start()    // 启动服务

let platform = require('os').platform()
let {exec} = require('child_process')

opn(`http://${ip}:${argv.port||config.port}`)
