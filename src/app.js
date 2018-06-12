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

    toBase(path) {
        let base = new Buffer(fs.readFileSync(path)).toString('base64')
        return base
    }

    handleRequest(req, res) {

        let _root = this.config.dir;
        let {pathname} = url.parse(req.url, true)
        let p = path.join(this.config.dir, decodeURIComponent(pathname))

        try {
            let stat = fs.statSync(p)

            // 如果是目录，可以进去目录
            if (stat.isDirectory()) {

                // let filepaths = fs.readdirSync(p).map(pa => path.join(p, pa))
                let files = fs.readdirSync(p)
                let imgs = {
                    'dir': this.toBase(`${__dirname}/img/dir.png`),
                    'js': this.toBase(`${__dirname}/img/js.png`),
                    'json': this.toBase(`${__dirname}/img/json.png`),
                    'css': this.toBase(`${__dirname}/img/css.png`),
                    'html': this.toBase(`${__dirname}/img/html.png`),
                    'file': this.toBase(`${__dirname}/img/file_common.png`),
                }

                files = files.map(file => {
                    let filepath = path.join(p, file);
                    let t = fs.statSync(filepath)
                    let type = t.isDirectory() ? 'dir' : 'file'
                    let fileBase = ''
                    // console.log(dir, 'type: ', mime.getType(dir))

                    if ( type === 'dir' ) {
                        fileBase = imgs[type]
                    } else {
                        let fileType = file.split('.')
                        let len = fileType.length
                        fileBase = imgs[fileType[len-1]] || imgs.file
                    }
                    return {
                        base: fileBase,
                        type: type,
                        filename: file,
                        pathname: encodeURIComponent(filepath.replace(_root, ''))
                    }
                })

                let sortDirs = []

                files.forEach(dir => {
                    if ( dir.type === 'dir' ) {
                        sortDirs.push(dir)
                    }
                })
                files.forEach(dir => {
                    if ( dir.type === 'file' ) {
                        sortDirs.push(dir)
                    }
                })

                let str = ejs.render(this.template, {
                    sortDirs,
                    title: 'template'
                })

                res.setHeader('Content-type', 'text/html;charset=utf8')
                res.end(str)
                
            } else {
                // 如果是文件，直接打开文件
                this.openFile(req, res, p, stat)
            }


        } catch(e) {
            console.log(e)
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
