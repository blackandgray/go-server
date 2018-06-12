let fs = require('fs')
let rs = fs.createReadStream(__dirname+'/dir.png')

let data = fs.readFileSync(__dirname + '/css.png')
data = new Buffer(data).toString('base64')
console.log(data)
