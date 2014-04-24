var bot = require('nodemw'),
  client = new bot({
        server: 'en.wikipedia.org',
        path: '/w',
        debug: true
    }),
    params = {
        action: 'query',
        prop: 'revisions',
        titles: 'River', 
        rvlimit: 'max',
        rvprop: 'timestamp'
    };

client.api.call(params, function(info, next, data) {
	var pageid = Object.keys(info.pages).shift(); 
    console.log(info.pages[pageid].revisions.length);
    console.log(next);
    console.log(data && data.query.results);
});
