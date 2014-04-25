var bot = require('nodemw'),
  client = new bot({
        server: 'en.wikipedia.org',
        path: '/w',
        debug: true
    }),
    myparams = {
        action: 'query',
        prop: 'revisions',
        titles: 'River', 
        rvlimit: 'max',
        rvprop: 'timestamp'
    };

function getRevisionInfo(params, callback, finalcall) {
	client.api.call(params, function(info, next, data) {
		var pageid = Object.keys(data.query.pages).shift(); 
	    console.log(data); //.query.pages[pageid].revisions);
	    
	    callback(data.query.pages[pageid].revisions);
	    
	    if (data["query-continue"] && data["query-continue"].revisions) {
	    	params.rvcontinue = data["query-continue"].revisions.rvcontinue;
	    	getRevisionInfo(params, callback, finalcall);
	    } else {
	    	finallcall && finalcall();
	    }
	    
	});
}

var rev_count = 0;
var all_revisions = [];
getRevisionInfo(myparams, function(revisions) {
	rev_count += revisions.length;
	all_revisions = all_revisions.concat(revisions);
}, function() {
	console.log(all_revisions);
	console.log("Revision count " + rev_count);
} );
