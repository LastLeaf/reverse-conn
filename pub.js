'use strict';

var fs = require('fs');
var net = require('net');

var config = JSON.parse( fs.readFileSync('config.json', {encoding: 'utf8'}) );

var connMap = {};
var controlConn = null;

// serve clients
var clientServer = net.createServer({pauseOnConnect: true}, function(conn){
	// try to build connection to redirector
	if(!controlConn) {
		conn.end();
		return;
	}
	var connId = Date.now() + Math.random();
	console.log('Data [' + connId + '] connected.');
	var initTobj = setTimeout(function(){
		conn.end();
	}, config.timeout);
	connMap[connId] = {
		client: conn,
		redirector: null,
		builtFunc: function(redirector){
			console.log('Data [' + connId + '] connected to redirector.');
			// redirector connection built
			clearTimeout(initTobj);
			redirector.on('error', function(err){
				console.log('Data [' + connId + '] error from redirector: ' + err.message);
			});
			redirector.on('close', function(){
				console.log('Data [' + connId + '] disconnected from server.');
				delete connMap[connId];
				conn.end();
			});
			redirector.on('data', function(data){
				conn.write(data);
			});
			conn.on('data', function(data){
				redirector.write(data);
			});
			conn.resume();
		}
	};
	conn.on('error', function(err){
		console.log('Data [' + connId + '] error from client: ' + err.message);
	});
	conn.on('close', function(){
		console.log('Data [' + connId + '] disconnected from client.');
		var connInfo = connMap[connId];
		if(!connInfo) return;
		if(connInfo.redirector) connInfo.redirector.end();
		delete connMap[connId];
	});
	controlConn.write(connId + '\n');
});
clientServer.listen(config.pubClientPort);

// serve redirectors
var redirectorServer = net.createServer(function(redirector){
	redirector.once('data', function(data){
		var str = data.toString('utf8');
		if(str[0] === '-') {
			// control connection
			if(config.password !== str.slice(1)) {
				redirector.end();
				return;
			}
			controlConn = redirector;
			console.log('Redirector connected.');
			redirector.on('error', function(err){
				console.log('Control connection error: ' + err.message);
			});
			redirector.on('close', function(){
				console.log('Redirector disconnected.');
				controlConn = null;
			});
		} else {
			// data connection
			var connId = str.slice(1);
			if(!connMap[connId] || connMap[connId].redirector) {
				redirector.end();
				return;
			}
			connMap[connId].redirector = redirector;
			connMap[connId].builtFunc(redirector);
		}
	});
});
redirectorServer.listen(config.pubRedirectorPort);

console.log('Server started.');
