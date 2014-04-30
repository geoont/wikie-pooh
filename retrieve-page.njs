/**
 *  Test script for the downloader
 */

'use strict';

var args = process.argv.slice(2);
if (args.length != 2) {
  console.error("usage: node " + process.argv[1] + " <language> <page>\n" +
    "  where\n    <language> is Wikipedia language code (en, zh, ru, etc.)\n" +
    "    <page> the name of the page to retrieve");
  process.exit(1);
}

var lang = args[0],
    page = args[1];

var bot = require('nodemw');

// pass configuration object
var client = new bot({
    server: lang + '.wikipedia.org',  // host name of MediaWiki-powered site
    path: '/w',                  // path to api.php script
    debug: false                // is more verbose when set to true
});

client.getArticle(page, function(data) {
    console.log(data);
});

console.log('finished');
