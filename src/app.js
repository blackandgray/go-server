let http = require('http')
let fs = require('fs')
let url = require('url')
let zlib = require('zlib')
let util = require('util')
let path = require('path')

let mime = require('mime')
let ejs = require('ejs')
let chalk = require('chalk')
let debug = require('debug')('*')

// 将方法转换成 promise 方法
// let stat = util.promisify(fs.stat)
// let readdir = util.promisify(fs.readdir)
let {config} = require('./config')
let template = fs.readFileSync(path.resolve(__dirname, 'template.html'), 'utf8')

// 创建服务器
class Server {

    constructor(args) {
        this.config = args
        this.template = template
    }

    handleRequest(req, res) {
        let {pathname} = url.parse(req.url, true)
        let p = path.join(this.config.dir, pathname)

        try {
            // let statObj = await stat(p)
            // let stat = fs.statSync(p)

            fs.stat(p, (error, stat) => {
                if (error && error.code === 'EEXIST') {
                    res.statusCode = 404
                    res.end()
                    return
                }
                if ( stat.isDirectory() ) {
                    fs.readdir(p, (err, data) => {
                        let dirs = data
                        dirs = dirs.map(dir => {
                            return {
                                filename: dir,
                                pathname: path.join(pathname, dir)
                            }
                        })
                        let str = ejs.render(this.template, {
                            dirs,
                            title: 'template'
                        })
                        res.setHeader('Content-type', 'text/html;charset=utf8')
                        res.end(str)
                    })
                    
                } else {
                    // 如果是文件，直接打开文件
                    this.openFile(req, res, p, stat)
                }
            })

        } catch(e) {
            // 文件/目录不存在
            this.sendError(req, res, e)
        }
    }

    range(req, res, p, stat) {
        let range = req.headers['range']
        if (range) {
            let [, start, end] = range.match(/(\d*)-(\d*)/) || []
            start = start ? parseInt(start) : 0
            end = end ? parseInt(end) : stat.size
            res.statusCode = 206
            res.setHeader('Accept-Ranges', 'bytes')
            res.setHeader('Content-Length', end - start + 1)
            res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`)
            return {
                start,
                end
            }
        } else {
            return {
                start: 0,
                end: stat.size
            }
        }
    }

    openFile(req, res, p, stat) {
        let {start, end} = this.range(req, res, p, stat)
        res.setHeader('Content-type', mime.getType(p) + ';charset=utf8')
        fs.createReadStream(p, {
            start: 0,
            end: 1024 * 64
        }).pipe(res)
    }

    // 没有找到文件或路径
    sendError(req, res, e) {
        res.statusCode = 404
        res.end('Not Found!')
    }

    // 启动服务
    start() {
        let server = http.createServer(this.handleRequest.bind(this))
        let {hostname, port} = this.config

        debug(`http://${chalk.yellow(hostname)}:${chalk.green(port)}`)
        server.listen(port, hostname)
    }
}

module.exports = Server
