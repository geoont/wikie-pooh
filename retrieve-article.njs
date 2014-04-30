/**
 *  Test script for the downloader 
 */

var bot = require('nodemw');

// pass configuration object
var client = new bot({
    server: 'zh.wikipedia.org',  // host name of MediaWiki-powered site
    path: '/w',                  // path to api.php script
    debug: false                // is more verbose when set to true
});

client.getArticle('山', function(data) {
    console.log(data);
});
  
console.log('finished');
