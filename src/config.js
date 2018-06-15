let path = require('path')
let os = require('os')

function getIP(){
    var interfaces = os.networkInterfaces()

    for(var devName in interfaces){

		var iface = interfaces[devName]

		for(var i=0;i<iface.length;i++){
		   var alias = iface[i]

		    if(alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal){
		        return alias.address
		    }
		}
    }
}

let ip = getIP()

let config = {
    hostname: ip,
    port: 8000,
    dir: path.join(__dirname, '..', 'public')
}

module.exports = { ip, config }