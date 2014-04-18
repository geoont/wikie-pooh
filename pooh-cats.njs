/**
 * Download subcategories for a specified Catgeory
 */
 
var bot = require('nodemw');

// pass configuration object
var client = new bot({
    server: 'en.wikipedia.org',  // host name of MediaWiki-powered site
    path: '/w',                  // path to api.php script
    debug: true                // is more verbose when set to true
});

// 0. Create a file (0.cats) with a seed list of Wikipedia pages with categories from national standards (one for each standard)
//   - make sure that actual pages exist in Wikipedia
// 1. For each seed page retrieve it and parse out the category list
//   - fail if a page does not exist
//   - create two files: one with unique pages and categories (1.cats) and the other with page-category pairs (1.pairs)
// 2. cleanup the first file from irrelevant categories
// 3. rerun retrieval program on the cleaned file
//   - if entry in the file starts with 'Category:' then get its subcatgories and pages
//   - else: this is a page, retrieve it and parse out categroies
//   - possibly save only new pages and categories
// 4. repeat until *.cats file stops growing
// 5. visualize in graphviz from *.pairs file  

client.getPagesInCategory('Rivers', function(pages) {
	client.log('Pages in category');
	client.logData(pages);

	pages.forEach(function(page) {
		client.getArticle(page.title, function(content) {
			client.log('%s: %s', page.title, content.substr(0, 75).replace(/\n/g, ' '));
		});
	});
});


console.log('finished');
 