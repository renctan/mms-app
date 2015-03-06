var ipc = require('ipc');
var util = require('util');

var ServerMsg = require('./server_api.js');

ipc.send(ServerMsg.in.fetchChartData, 'pagefault url');

ipc.on(ServerMsg.out.fetchChartDataRet, function(obj) {
	console.log('got reply');
	console.log(obj);
document.write(util.inspect(obj));	
});
