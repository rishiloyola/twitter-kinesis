'use strict';

var util = require('util');
var logger = require('../util/logger');
var AWS = require('aws-sdk');
var config = require('../bin/config.js');
var kinesis = new AWS.Kinesis({region : config.kinesis.region});


function sampleProducer() {
    var log = logger().getLogger('sampleProducer');

    function _createStreamIfNotCreated(callback) {
        var status;
        var params = {
            ShardCount: config.sampleProducer.shards,
            StreamName: config.sampleProducer.stream
        };

        var status = kinesis.createStream(params, function(err, data) {
            if (err) {
                if (err.code !== 'ResourceInUseException') {
                    callback(err);
                    return false;;
                } else {
                    log.info(util.format('%s stream is already created. Re-using it.', config.sampleProducer.stream));
                }
            } else {
                log.info(util.format("%s stream doesn't exist. Created a new stream with that name ..", config.sampleProducer.stream));
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
        kinesis.describeStream({ StreamName: config.sampleProducer.stream }, function(err, data) {
            if (!err) {
                log.info(util.format('Current status of the stream is %s.', data.StreamDescription.StreamStatus));
                if (data.StreamDescription.StreamStatus === 'ACTIVE') {
                    callback(null);
                } else {
                    setTimeout(function() {
                        _waitForStreamToBecomeActive(callback);
                    }, 1000 * config.sampleProducer.waitBetweenDescribeCallsInSeconds);
                }
            }
        });
    }

    function _writeToKinesis(data) {
        var sensor = 'sensor-' + Math.floor(Math.random() * 100000);

        var recordParams = {
            Data: JSON.stringify(data),
            PartitionKey: sensor,
            StreamName: config.sampleProducer.stream
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
