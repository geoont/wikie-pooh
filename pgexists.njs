/**
 * Workaround of lack of error processing in nodemw
 */
'use strict';

var args = process.argv.slice(2);
if (args.length != 2) {
  console.error("usage: node " + process.argv[1] + " <language> <page>\n" +
    "  where\n    <language> is Wikipedia language code (en, zh, ru, etc.)\n" +
    "    <page> Wikipedia page to check");
  process.exit(1);
}

var lang  = args[0],
    title = args[1];

// pass configuration object
var bot = require('nodemw');
var client = new bot({
    server: lang + '.wikipedia.org',  // host name of MediaWiki-powered site
    path: '/w',                  // path to api.php script
    debug: true                // is more verbose when set to true
});

var params = {
  action: 'query',
  titles: title,
};

client.api.call(params, function(info, next, data) {
  console.log(info);
  console.log(next);
  console.log(data);
});
