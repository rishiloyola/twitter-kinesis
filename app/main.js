//Initialize twitter and appbase modules.
//request module is required for the twitter api

var Twit = require('twit');
var request = require("request");
var fs = require("fs");

var producer = require('../bin/producer.js');

var content = fs.readFileSync("config.json");
var jsonContent = JSON.parse(content);

//Required authetication of twitter api
var T = new Twit({
    consumer_key: jsonContent.twitter.consumer_key,
    consumer_secret: jsonContent.twitter.consumer_secret,
    access_token: jsonContent.twitter.access_token,
    access_token_secret: jsonContent.twitter.access_token_secret
});


//Filter tweets related to swarmapp
var stream = T.stream('statuses/filter', { track: 'swarmapp', language: 'en' });
var streamStatus = producer().run();

//Streaming of twitter tweets
stream.on('tweet', function(tweet) {

  if (verifyTweets(tweet)){

    var swarmappUrl = tweet.entities.urls[0].display_url;
    //extracting id from that url
    var FSid = swarmappUrl.split("/")[2];
    //created url to get data of that checkin from swarmapp
    var FSurl = "https://api.foursquare.com/v2/checkins/resolve?shortId="+FSid+"&oauth_token="+jsonContent.foursquare.oauth_token+"&v=20150919";
    //Getting data from foursquare
    
    request(FSurl, function(error, response, body) {
        if(verifyFoursquare(body,error)){
            var parsedbody = JSON.parse(body);

            if(parsedbody.meta.code==200){
                var data = {
                  id: parsedbody.response.checkin.id
                  shout: parsedbody.response.checkin.shout,
                  city: parsedbody.response.checkin.venue.location.city,
                  category: parsedbody.response.checkin.venue.categories[0].shortName,
                  venue: parsedbody.response.checkin.venue.name,
                  url: swarmappUrl,
                  username: parsedbody.response.checkin.user.firstName,
                  state: parsedbody.response.checkin.venue.location.state,
                  country: parsedbody.response.checkin.venue.location.country
                };
                if (streamStatus){
                  producer().sendData(data);
                }
            }
        }
    });
  }
});


function verifyTweets(tweet) {

    if (tweet) {
        if (tweet.entities) {
            if (tweet.entities.urls[0]) {
                if (tweet.entities.urls[0].display_url) {
                    return true;
                }
            }
        }
    }

    return false;
}

function verifyFoursquare(fsdata,error){
  if(fsdata && !error){
      var parsedbody = JSON.parse(fsdata);
      if(parsedbody.response){
        if(parsedbody.response.checkin){
          if(parsedbody.response.checkin.venue && parsedbody.response.checkin.user){
            if(parsedbody.response.checkin.venue.location.city && parsedbody.response.checkin.user.firstName && parsedbody.response.checkin.venue.location.state && parsedbody.response.checkin.venue.location.country){
              if(parsedbody.response.checkin.venue.categories[0]){
                if(parsedbody.response.checkin.venue.categories[0].shortName){
                  if(parsedbody.response.checkin.venue.name){
                    if(parsedbody.response.checkin.shout){
                      return true;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  return false;  
}
