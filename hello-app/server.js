'use strict';

var fs = require('fs');
var urllib = require('urllib');
var _ = require('underscore');

var ServerMsg = require('./server_api.js');
var config = require('../config.js');

var RESPONSE_OK_CODE = 200;

/**
 * @param errorHandler {function(errorObject)}
 */
var downloadMetrics = function(groupID, hostID, outputFilePath, errorHandler) {
    var metricsURL = config.serverURLRoot + '/groups/' + groupID + '/hosts/' + hostID + '/metrics';

    var defaultRequestOptions = function() {
	return {
	    method: 'GET',
	    digestAuth: config.digestAuth,
	    headers: {
		'Content-Type': 'application/json'
	    },
	    gzip: true
	}
    };

    var requestOptions = defaultRequestOptions();
    requestOptions.dataType = 'json';

    var req = urllib.request(metricsURL, requestOptions, function(err, data, res) {
        if (err) {
	    console.log('request error!');
	    console.log(err);
	    errorHandler({ err: err });
	    return;
	}

	if (res.statusCode != RESPONSE_OK_CODE) {
	    console.log('got err');
	    errorHandler({ err: res.statusMessage });
	    return;
	}

	var rawMetricData = [];
	var out = fs.createWriteStream(outputFilePath);
	out.on('error', function(err) {
	    errorHandler({ err: err });
	});
	console.log('REN: opened file: ' + outputFilePath);
	console.log('REN: data: ' + JSON.stringify(data));
	var metricCount = data.results.length;

	_.each(data.results, function(metric, index, list) {
	    var url = config.serverURLRoot +
	              '/groups/' + groupID +
                      '/hosts/' + hostID +
                      '/metrics/' + metric.metricName;

	    if (config.metricsGranularity != null) {
		var param = '?granularity=' + config.metricsGranularity +
		    '&period=' + config.metricsPeriod;
		url += param;
	    }

	    // DEBUG
	    console.log(metric.metricName);
	    if (metric.metricName != 'OPCOUNTERS_QUERY') {
		return;
	    }

	    urllib.request(url, defaultRequestOptions(), function(err, data, res) {
	        if (err) {
		    console.log('request error!');
		    console.log(err);
		    errorHandler({ err: err });
		    return;
		}

		if (res.statusCode != RESPONSE_OK_CODE) {
		    console.log('got err: requesting: ' + url + ': ' + res.statusMessage);
		    errorHandler({ err: res.statusMessage });
		    return;
		}

		console.log('REN: got from: ' + url);
		// DEBUG
		errorHandler(data.toString());
		out.write(data.toString() + '\n');

		out.end(); // DEBUG
		if (--metricCount == 0) {
		    out.end();
		}
	    });
        });
    });

    req.on('error', function(err) {
        errorHandler({ err: err });
    });
};

var loadFromFile = function(fileName) {
    var data = fs.readFileSync(fileName);
    return JSON.parse(data);
};

exports.run = function() {
    var ipc = require('ipc');
    ipc.on(ServerMsg.in.fetchChartData, function(event, arg) {
        var errorHandler = function(err) {
	    event.sender.send(ServerMsg.out.fetchChartDataRet, err);
	};

	downloadMetrics(config.groupId, config.hostId, config.outputFile, errorHandler);
    });
};