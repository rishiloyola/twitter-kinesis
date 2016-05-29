'use strict';

var util = require('util');
var logger = require('../util/logger');

function sampleProducer(kinesis, config) {
    var log = logger().getLogger('sampleProducer');

    function _createStreamIfNotCreated(callback) {
        var status;
        var params = {
            ShardCount: config.shards,
            StreamName: config.stream
        };

        var status = kinesis.createStream(params, function(err, data) {
            if (err) {
                if (err.code !== 'ResourceInUseException') {
                    callback(err);
                    return false;;
                } else {
                    log.info(util.format('%s stream is already created. Re-using it.', config.stream));
                }
            } else {
                log.info(util.format("%s stream doesn't exist. Created a new stream with that name ..", config.stream));
            }
            // Poll to make sure stream is in ACTIVE state before start pushing data.
            _waitForStreamToBecomeActive(callback);
            return true;
        });

        if (status.response.error) {
            return false;
        } else {
            return true;
        }

    }

    function _waitForStreamToBecomeActive(callback) {
        kinesis.describeStream({ StreamName: config.stream }, function(err, data) {
            if (!err) {
                log.info(util.format('Current status of the stream is %s.', data.StreamDescription.StreamStatus));
                if (data.StreamDescription.StreamStatus === 'ACTIVE') {
                    callback(null);
                } else {
                    setTimeout(function() {
                        _waitForStreamToBecomeActive(callback);
                    }, 1000 * config.waitBetweenDescribeCallsInSeconds);
                }
            }
        });
    }

    function _writeToKinesis(data) {
        var currTime = new Date().getMilliseconds();
        var sensor = 'sensor-' + Math.floor(Math.random() * 100000);
        var reading = Math.floor(Math.random() * 1000000);

        var record = JSON.stringify({
            time: currTime,
            reading: data
        });

        var recordParams = {
            Data: record,
            PartitionKey: sensor,
            StreamName: config.stream
        };

        kinesis.putRecord(recordParams, function(err, data) {
            if (err) {
                log.error(err);
            } else {
                log.info('Successfully sent data to Kinesis.');
            }
        });
    }

    return {
        run: function() {
            var status = _createStreamIfNotCreated(function(err) {
                if (err) {
                    log.error(util.format('Error creating stream: %s', err));
                    return;
                }
            });
            return status;
        },

        sendData: function(data) {
            _writeToKinesis(data);
        }
    };
}

module.exports = sampleProducer;
