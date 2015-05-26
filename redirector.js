'use strict';

var fs = require('fs');
var net = require('net');

var config = JSON.parse( fs.readFileSync('config.json', {encoding: 'utf8'}) );

var connMap = {};
var controlConn = null;

// build data connection
var dataConnect = function(connId){
	console.log('Building data connection for [' + connId + '] ...');
	var conn = connMap[connId].pub = net.connect({
		host: config.pubServerAddr,
		port: config.pubRedirectorPort
	}, function(){
		console.log('Data [' + connId + '] connected to pub server (client side).');
		conn.pause();
		conn.write('+' + connId);
		// connect to destination
		var redirect = net.connect({
			host: config.redirectAddr,
			port: config.redirectPort
		}, function(){
			if(!connMap[connId]) {
				redirect.end();
				return;
			}
			console.log('Data [' + connId + '] connected to destination (server side).');
			connMap[connId].redirect = redirect;
			clearTimeout(initTobj);
			redirect.on('data', function(data){
				conn.write(data);
			});
			conn.on('data', function(data){
				redirect.write(data);
			});
			conn.resume();
		});
		redirect.on('error', function(err){
			console.log('Data [' + connId + '] error from server side: ' + err.message);
		});
		redirect.on('close', function(){
			console.log('Data [' + connId + '] disconnected from server side.');
			delete connMap[connId];
			conn.end();
		});
	});
	var initTobj = setTimeout(function(){
		conn.end();
	}, config.timeout);
	conn.on('error', function(err){
		console.log('Data [' + connId + '] error from client side: ' + err.message);
	});
	conn.on('close', function(){
		console.log('Data [' + connId + '] disconnected from client side.');
		var connObj = connMap[connId];
		if(!connObj) return;
		if(connObj.redirect) connObj.redirect.end();
		delete connMap[connId];
	});
};

// build control connection
var reconnect = function(){
	console.log('Building control connection...');
	controlConn = net.connect({
		host: config.pubServerAddr,
		port: config.pubRedirectorPort
	}, function(){
		console.log('Control connected.');
		// auth
		controlConn.write('-' + config.password);
		controlConn.on('data', function(data){
			var str = data.toString('utf8');
			str.split('\n').forEach(function(connId){
				if(!connId || connMap[connId]) return;
				connMap[connId] = {
					pub: null,
					redirect: null
				};
				dataConnect(connId);
			});
		});
	});
	controlConn.on('error', function(err){
		console.log('Control connection error: ' + err.message);
	});
	controlConn.on('close', function(){
		console.log('Control disconnected.');
		setTimeout(reconnect, 5000);
	});
};
reconnect();
