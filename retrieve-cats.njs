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
}).replace(/-edited/, ''); /* removed the word 'edited' if it was there */
if (out_cats == init_cats)
  out_cats = "out.cats";

console.log("language=" + lang + ", init_cats=" + init_cats + ", out_cats=" + out_cats);

var bot = require('nodemw'),
	fs = require('fs'),
	async = require('async');

var wiki_srv = lang + '.wikipedia.org';
var wiki_uri = 'http://' + wiki_srv + '/wiki/';
 
// pass configuration object
var client = new bot({
    server: wiki_srv,  // host name of MediaWiki-powered site
    path: '/w',                  // path to api.php script
    debug: true                // is more verbose when set to true
});

// 0. Create a file (0.cats) with a seed list of Wikipedia pages with categories from national standards (one for each standard)
//   - make sure that actual pages exist in Wikipedia

// 1. For each seed page retrieve it and parse out the category list
//   - fail if a page or category does not exist
//   - create two files: one with unique pages and categories (1.cats) and the other with page-category pairs (1.pairs)
var lineReader = require('line-reader');
var r_entries = {};
var in_cat_count = 0, in_page_count = 0, out_count = 0;

var input_entries = [], ignored_entries = {};
lineReader.eachLine(init_cats, function(line, last) {

  console.log(line);
  /* skip comments and empty lines */
  line = line.replace(/#.*$/, '');
  if (line.match(/^\s*$/)) return;

  var entry = line.split("\t")[0].trim();

  if (entry.match(/^-/))
  	ignored_entries[entry.substring(1)] = 1;
  else
  	input_entries.push(entry);

}).then(function(){

	console.log(input_entries.length + " entries loaded");
	async.eachSeries(input_entries, process_entry, function(err) {

		console.log('Input processed: %s categories and %s pages from %s', in_cat_count, in_page_count, init_cats);

		var outp = fs.WriteStream(out_cats);
		outp.write("#entry\tsource\n");
		
		var keys = Object.keys(r_entries);

		var outhtml = fs.WriteStream(out_cats + ".html");
		outhtml.write("<html><head><title>Categories from " + 
			out_cats + " for language " + lang + 
			"</title></head><body><h1>" + 
			out_cats + " for language " + lang + 
			', ' + keys.length + ' entries ' +
			"</h1><table border=1><tr><th>Flg</th><th>Entry</th><th>Source</th></tr>\n");

		keys.sort();
  		for (var k in keys) {
  			if (!(keys[k] in ignored_entries)) {
          		var prefix = '';
          		var sources = Object.keys(r_entries[keys[k]]);
          		var sources_html = sources.map(function(s){
          			if (s == "PAGE NOT FOUND") {
          				prefix = '-';
          				return s;
          			} else { 
          				return '<a href="' + wiki_uri + s + '">' + s + '</a>';
          			} 
          		}).join();
    			outp.write( prefix + keys[k] + "\t" + sources + "\n");
    			outhtml.write("<tr><td>" + prefix + 
    				'</td><td><a href="' + wiki_uri + keys[k] + '">' + keys[k] + 
    				'</a></td><td>' + sources_html + "</td></tr>\n"); 
        	}
  		}
  		
  		// save ignored entries
  		for (k in ignored_entries) {
  			outp.write( "-" + k + "\tIGNORED\n");
    			outhtml.write("<tr><td>-</td><td>" + k + "</td><td>IGNORED</td></tr>\n"); 
  		}

		outhtml.write(
			'</table><h1>Output produced: ' + keys.length + 
			' unique entries of total ' + out_count + 
			' into ' + out_cats + 
			'</h1></body></html>'
			);
		console.log('Output produced: ' + keys.length + ' unique entries of total ' + out_count + ' into ' + out_cats);
		//console.log(">>>>>>>\n");
		//console.log(r_entries);
	});
});

// 2. manually cleanup the first file from irrelevant categories
// 3. rerun retrieval program on the cleaned file
//   - if entry in the file starts with 'Category:' then get its subcatgories and pages
//   - else: this is a page, retrieve it and parse out categroies
//   - possibly save only new pages and categories
// 4. repeat until *.cats file stops growing
// 5. visualize in graphviz or SOFT from *.pairs file

console.log('finished');

function process_entry(entry, callback) {

	if (entry in ignored_entries) {
		console.log("Skipped entry: " + entry);
		callback && callback();
		return;
	}
  	console.log("Processing entry: " + entry);

	if (entry.indexOf(cat_name) == 0) {
		in_cat_count++;

		var category = entry.substring(cat_name.length);
		console.log("Retrieving category: " + category);
		client.getPagesInCategory(category, function(pages) {
			//	client.log('Pages in category');
			//	client.logData(pages);

			for (var i=0; i<pages.length; i++) {
		        if (pages[i].title in r_entries)
		        	r_entries[pages[i].title][entry]++; // increment count of sources
		        else {
				    r_entries[pages[i].title] = {};
				    r_entries[pages[i].title][entry] = 1;
			    }
				//outp.write( page.title + "\t" + entry + "\n" );
				out_count++;
			}

			callback && callback();
		});

	} else { // processing of a page (not a category)

	    client.api.call({action:'query', titles:entry}, function(info, next, data) {

        /* check if the page exists */
        var pageid = Object.keys(data.query.pages).shift();

        if (pageid > 1) { // other pageid indicate that the page does not exist or other error
			in_page_count++;

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
		                  r_entries[ma[1]][entry]++
		                else {
					      r_entries[ma[1]] = {};
					      r_entries[ma[1]][entry] = 1;
					    }
					    out_count++;
  						//console.log(lines[i]);
  						//console.log(ma[1]);
  						//outp.write( ma[1] + "\t" + entry + "\n");
  					}
            	}
				callback && callback();
      		});

        } else { // page not found
          r_entries[entry] = {"PAGE NOT FOUND" : 1};
          console.log(entry + "\tPAGE NOT FOUND \n");
          //outp.write( entry + "\tPAGE NOT FOUND\n");
			callback && callback();
        }
		});

	}
}
