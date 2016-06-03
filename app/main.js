//Initialize twitter and appbase modules.
//request module is required for the twitter api

var Twit = require('twit');
var request = require("request");
var Appbase = require("appbase-js");
var fs = require("fs");
var content = fs.readFileSync("config.json");
var jsonContent = JSON.parse(content);

var AWS = require('aws-sdk');
var config = require('../bin/config.js');
var producer = require('../bin/producer.js');

const HOSTNAME = jsonContent.appbase.hostname
const APPNAME = jsonContent.appbase.appname
const USERNAME = jsonContent.appbase.username
const PASSWORD = jsonContent.appbase.password


//Required authetication of twitter api
var T = new Twit({
    consumer_key: jsonContent.twitter.consumer_key,
    consumer_secret: jsonContent.twitter.consumer_secret,
    access_token: jsonContent.twitter.access_token,
    access_token_secret: jsonContent.twitter.access_token_secret
});


//Filter tweets related to swarmapp
var stream = T.stream('statuses/filter', { track: 'swarmapp', language: 'en' });


var appbaseObj = new Appbase({
    "url": "https://scalr.api.appbase.io",
    "appname": APPNAME,
    "username": USERNAME,
    "password": PASSWORD
});

var kinesis = new AWS.Kinesis({region : config.kinesis.region});
var streamStatus = producer(kinesis, config.sampleProducer).run();

//Streaming of twitter tweets
stream.on('tweet', function(tweet) {

  if (verifyTweets(tweet)) {

    var data = {
      text: tweet.text,
      name: tweet.user.name,
      location: tweet.user.location
    }

    if (streamStatus){
      producer(kinesis, config.sampleProducer).sendData(data);
    }
  }

});


function verifyTweets(tweet) {

    if (tweet) {
        if (tweet.text) {
            if (tweet.user && tweet.user.name) {
                if (tweet.user.location) {
                    return true;
                }
            }
        }
    }

    return false;
}
