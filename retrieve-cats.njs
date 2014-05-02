/**
 * Retrieve related categories for a list pages or categories
 */
'use strict';

var args = process.argv.slice(2);
if (args.length != 2) {
	console.error("usage: node " + process.argv[1] + " <language> <input_list.cats>\n" +
		"  where\n    <language> is Wikipedia language code (en, zh, ru, etc.)\n" +
		"    <input_list.cats> is a file with an initial list of pages and categories");
	process.exit(1);
}

var lang      = args[0],
    init_cats = args[1];

/* list of category names in different languages */
var cat_names = {
	"en" : "Category:",
	"ru" : "Категория:",
	"zh" : "Category:"
	//"zh" : "分类："
};

var cat_name = cat_names[lang];
if (!cat_name) {
	console.log("No category name for language=" + lang);
	process.exit(1);
}
var cat_re = new RegExp("\\[\\[(" + cat_name + "[^\\]\\|]+)(?:\\|[^\\]]+)?\\]\\]");

/* output file name: bump the number of input file by one */
var out_cats = init_cats.replace( /(\d+)/, function(match, p1, offset, str) {
  //console.log(match + ", " + p1 + ", " + offset + ", " + str);
  return parseInt(p1) + 1;
});
if (out_cats == init_cats)
  out_cats = "out.cats";

console.log("language=" + lang + ", init_cats=" + init_cats + ", out_cats=" + out_cats);

var bot = require('nodemw');

// pass configuration object
var client = new bot({
    server: lang + '.wikipedia.org',  // host name of MediaWiki-powered site
    path: '/w',                  // path to api.php script
    debug: true                // is more verbose when set to true
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
var outp = fs.WriteStream(out_cats);
outp.write("#entry\tsource\n");
var in_cat_count = 0, in_page_count = 0;
var out_count = 0;
outp.on('finish', function() {
	console.log('Output produced: %s entries into %s', out_count, out_cats);
} );
var r_entries = {};
rd.on('line', function(line) {

  /* skip comments and empty lines */
  line = line.replace(/#.*$/, '');
  if (line.match(/^\s*$/)) return;

  var entry = line.split("\t")[0].trim();
  console.log("Processing entry: " + entry);

	if (entry.indexOf(cat_name) == 0) {

		var category = entry.substring(cat_name.length);
		console.log("Retrieving category: " + category);
		client.getPagesInCategory(category, function(pages) {
			//	client.log('Pages in category');
			//	client.logData(pages);

			pages.forEach(function(page) {
        if (page.title in r_entries)
          r_entries[page.title].push(entry)
        else
          r_entries[page.title] = [entry];
				//outp.write( page.title + "\t" + entry + "\n" );
				out_count++;
			});
		});
		in_cat_count++;

	} else { // processing of a page (not a category)

    client.api.call({action:'query', titles:entry}, function(info, next, data) {

        /* check if the page exists */
        var pageid = Object.keys(data.query.pages).shift();

        if (pageid > 1) { // other pageid indicate that the page does not exist or other error

      		client.getArticle(entry, function(content) {
      			//console.log(content);
      			console.log('Downloaded %s (%s): %s...', entry, pageid, content.substr(0, 25).replace(/\n/g, ' '));

      			/* parsing out categories */
      			var lines = content.match(/[^\r\n]+/g);
      			//console.log(lines);
      			for( var i = 0; i < lines.length; i++) {
      				//console.log(lines[i]);
      				//var re = /\[\[(Category:[^\]]+)\]\]/;
      				var ma = cat_re.exec(lines[i]);
      				if( ma ) {
                if (ma[1] in r_entries)
                  r_entries[ma[1]].push(entry)
                else
                  r_entries[ma[1]] = [entry];
      					//console.log(lines[i]);
      					//console.log(ma[1]);
      					//outp.write( ma[1] + "\t" + entry + "\n");
      				}
            }
      		});

        } else { // page not found
          r_entries[entry] = ["PAGE NOT FOUND"];
          console.log(entry + "\tPAGE NOT FOUND \n");
          //outp.write( entry + "\tPAGE NOT FOUND\n");
        }
		});

		in_page_count++;
	}
}).on('close', function() {
	console.log('Input processed: %s categories and %s pages from %s', in_cat_count, in_page_count, init_cats);
  for (var k in r_entries) {
    outp.write( k + "\t" + r_entries[k].join() + "\n");
    console.log( k + "\t" + r_entries[k].join() + "\n");
  }
	//outp.end();
});

// 2. manually cleanup the first file from irrelevant categories
// 3. rerun retrieval program on the cleaned file
//   - if entry in the file starts with 'Category:' then get its subcatgories and pages
//   - else: this is a page, retrieve it and parse out categroies
//   - possibly save only new pages and categories
// 4. repeat until *.cats file stops growing
// 5. visualize in graphviz or SOFT from *.pairs file

console.log('finished');
