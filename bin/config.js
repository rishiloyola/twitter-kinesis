// AWS kinesis config.

'use strict';

var config = module.exports = {
  kinesis : {
    region : 'us-east-1'
  },

  sampleProducer : {
    stream : 'test_stream',
    shards : 1,
    waitBetweenDescribeCallsInSeconds : 5
  }
};
