/**
 * Download edit stats for a list of pages in the input file
 */
'use strict';

var args = process.argv.slice(2);
if (args.length != 2) {
  console.error("usage: node " + process.argv[1] + " <language> <input_list.cats>\n" +
    "  where\n    <language> is Wikipedia language code (en, zh, ru, etc.)\n" +
    "    <input_list.cats> is a file with a list of pages and categories");
  process.exit(1);
}

var lang      = args[0],
    init_cats = args[1];

/* output file name: bump the number of input file by one */
var outp = init_cats.replace(/\.cats$/, ".stats");
if (outp == init_cats) outp = "out.stats";

console.log("language=" + lang + ", init_cats=" + init_cats + ", outp=" + outp);

var bot = require('nodemw');

// pass configuration object
var client = new bot({
    server: lang + '.wikipedia.org',  // host name of MediaWiki-powered site
    path: '/w',                  // path to api.php script
    debug: false                // is more verbose when set to true
});

var fs = require('fs'),
    readline = require('readline');

// 0. Create a file (0.cats) with a seed list of Wikipedia pages with categories from national standards (one for each standard)
//   - make sure that actual pages exist in Wikipedia

var rd = readline.createInterface({
    input: fs.createReadStream(init_cats),
    output: process.stdout,
    terminal: false
});

// 1. For each seed page retrieve it and parse out the category list
//   - fail if a page or category does not exist
//   - create two files: one with unique pages and categories (1.cats) and the other with page-category pairs (1.pairs)
var outp = fs.WriteStream(outp);
outp.write("#page\tedits\tfirst_edit\tlast_edit\n");
rd.on('line', function(line) {

  /* skip comments and empty lines */
  line = line.replace(/#.*$/, '');
  if (line.match(/^\s*$/)) return;

  var entry = line.split("\t")[0].trim();
  console.log("Processing entry: " + entry);

  if (entry.indexOf('Category:') == 0) {
    console.log("Skipped category: " + entry);
    return;
  }

  var myparams = {
    action: 'query',
    prop: 'revisions',
    titles: entry,
    rvlimit: 'max',
    rvprop: 'timestamp'
  };

  var rev_count = 0;
  var all_revisions = [];
  var first_edit = null, last_edit = null;

  getRevisionInfo(myparams, function(revisions) {
    rev_count += revisions.length;

    if (last_edit == null)
      last_edit = revisions[0].timestamp;
    first_edit = revisions[revisions.length - 1].timestamp;

    //all_revisions = all_revisions.concat(revisions);
  }, function() {
    outp.write(entry + "\t" + rev_count + "\t" + first_edit + "\t" + last_edit + "\n");
    console.log("'" + entry + "' revision count: " + rev_count);
  } );

});

function getRevisionInfo(params, callback, finalcall) {
	client.api.call(params, function(info, next, data) {
		var pageid = Object.keys(data.query.pages).shift();
	    //console.log(data); //.query.pages[pageid].revisions);

	    callback(data.query.pages[pageid].revisions);

	    if (data["query-continue"] && data["query-continue"].revisions) {
	    	params.rvcontinue = data["query-continue"].revisions.rvcontinue;
	    	getRevisionInfo(params, callback, finalcall);
	    } else {
	    	finalcall && finalcall();
	    }

	});
}
