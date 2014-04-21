/**
 * Download subcategories for a specified Catgeory
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

/* output file name: bump the number of input file by one */
var fname_c = parseInt(init_cats);
var out_cats = isNaN(fname_c) ? 'out.cats' : (fname_c+1) + '.cats';

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
outp.on('close', function() {} );
var in_cat_count = 0, in_page_count = 0;
var out_count = 0;
rd.on('line', function(line) {
	var entry = line.trim();
    console.log("Processing entry: " + entry);

	if (entry.indexOf('Category:') == 0) {
		var category = entry.replace(/^Category:/, '');
		console.log(category);
		client.getPagesInCategory(category, function(pages) {
			//	client.log('Pages in category');
			//	client.logData(pages);
		
			pages.forEach(function(page) {
				outp.write( page.title + "\n" );
				out_count++;
			});
		});
		in_cat_count++;
	} else {
		if (in_page_count > 0) return;
		client.getArticle(entry, function(content) {
//			client.log(content);
			client.log('Downloaded %s: %s', page.title, content.substr(0, 75).replace(/\n/g, ' '));
			content.split(/\n/).forEach( function(line) {
				re = /\[\[Catgeoru:([^]])+\]\]/;
				var ma = re.exec(line);
				if( ma ) {
					console.log(ma[1]);
				}
			});
		});
		in_page_count++;
	}    
}).on('close', function() {
	console.log('Input processed: %s categories and %s pages from %s', in_cat_count, in_page_count, init_cats);
	console.log('Output produced: %s entries into %s', out_count, out_cats);
});

// 2. manually cleanup the first file from irrelevant categories
// 3. rerun retrieval program on the cleaned file
//   - if entry in the file starts with 'Category:' then get its subcatgories and pages
//   - else: this is a page, retrieve it and parse out categroies
//   - possibly save only new pages and categories
// 4. repeat until *.cats file stops growing
// 5. visualize in graphviz or SOFT from *.pairs file  

console.log('finished');
 