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
 