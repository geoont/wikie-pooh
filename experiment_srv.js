/**
 * Server with experiment results
 */

/* process arguments */
'use strict';

var args = process.argv.slice(2);
if (args.length != 2) {
	console.error("usage: node " + process.argv[1] + " <language> <input_list.cats>\n" +
		"  where\n    <language> is Wikipedia language code (en, zh, ru, etc.)\n" +
		"    <expertiment.sqlite3> sqlite 3 database to be created\n") ;
	process.exit(1);
}

var lang   = args[0],
    dbfile = args[1];

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

/* wikipedia retriever bot */
var bot = require('nodemw'),
	fs = require('fs'),
	async = require('async');

var wiki_srv = lang + '.wikipedia.org';
var wiki_uri = 'http://' + wiki_srv + '/wiki/';

var client = new bot({
	server: wiki_srv,  /* host name of MediaWiki-powered site */
	path: '/w',        /* path to api.php script */
	debug: true        /* is more verbose when set to true */
});

/* open the database */
var sqlite3 = require('sqlite3').verbose();
console.log("Opening database: " + dbfile);
var db = new sqlite3.Database(dbfile, sqlite3.OPEN_READWRITE, function(err) {
	if (err) {
		console.error('Unable to connect to database: ' + err);
		process.exit(2);
	}
});

/* launch the main server */
var srv_port = 8282;
var http = require('http')
var finalhandler = require('finalhandler')
var serveStatic = require('serve-static')

/* Serve up public/ftp folder */
var serve = serveStatic('.', {'index': ['index.html', 'index.htm']})

/* Create server */
var server = http.createServer(function(req, res){
  console.log('HTTP request: ' + req.url);
  var done = finalhandler(req, res)
  serve(req, res, done)
})

var io = require('socket.io').listen(server);
io.sockets.on('connection', onConnect);

/* launch servlets for specific functions */
var soc;
function onConnect(socket) {
    socket.on('getEntryList', handleEntryListRequest);
    socket.on('getPgtitle', handlePgtitleRequest);
    socket.on('loadEntry', handleLoadEntry);
    socket.on('parseEntry', handleParseEntry);
    socket.on('updateComment', handleUpdateComment);
    socket.on('loadSubcats', handleLoadSubcats);
    soc = socket;
}

/*** SERVLETS ***/

var srcs_stmt = db.prepare("SELECT src_entry FROM cat_src WHERE entry = ?");
var ent1_stmt = db.prepare("SELECT rowid, * FROM entries WHERE entry = ?");

/**
 * Queries the database to retrieve information about specific entry.
 * 
 * @param entry_name entry name to get the data
 * @param callback (entry)
 */
function getEntryData(entry_name, callback) {
	
	ent1_stmt.get( entry_name, function(err, entry) {
		
		if (!entry)
			console.trace ('failed to retrieve entry "' + entry_name + '"');
		
		/* reduce content size to 1024 characters */
		if (entry.content && entry.content.length > 1024)
			entry.content = entry.content.substring(0, 1024) + '...';
		
		srcs_stmt.all(entry.entry, function(err, all_srcs) {
			//console.log(all_srcs);
			if (all_srcs.length > 0) {
				entry['sources'] = all_srcs.map(function(item) {
					return item.src_entry
				}).filter( function(item) {
					return item
				});
			}
			//console.log(entry);
			callback && callback(entry);
		});
		
	});
	
}

/**
 * Converts a list of entries to the JSON structure for sending to the client
 * 
 * @param entry_names list of entry_names 
 * @param callback will be called with a hash array of entries as its argument
 */
function packEntryList(entry_names, callback) {
	var entry_list = [];
	entry_names.forEach( function( entry_name, i ) {
		getEntryData(entry_name, function(entry) {
			entry_list.push(entry);
			if (entry_names.length == entry_list.length)
				callback && callback(entry_list);
		});
	});
}

var ents_stmt = db.prepare("SELECT rowid, entry FROM entries ORDER BY rowid");
/**
 * Send a list of Wikipedia entries to the browser 
 */
function handleEntryListRequest() {
	//console.log('Entry list request, sending ' + entryList);
	ents_stmt.all( function(err, entry_list) {
		packEntryList(
			entry_list.map( function(entry){
				return entry.entry
			}), 
			function(upd_entry_list) {
				soc.emit('addEntries', upd_entry_list );
			})
	});
}

/**
 * Basic servlet configuration: working database, language, number of entities, URLs
 */
function handlePgtitleRequest() {
	db.get("SELECT count(*) AS cnt FROM entries", function(err, row) {
		soc.emit('pgtitle', { 
			'name' : dbfile, 
			'lang' : lang, 
			'entry_count' : (row ? row.cnt : 0),
			'srv' : wiki_srv,
			'uri' : wiki_uri,
			'cat_name' : cat_name /* the word 'category' in the respective language */
		});
	});
}

/**
 * Handles update entry request, can be called by other handles
 * @param entry
 */
function handleUpdateEntry(entry_name) {
	//console.log(entry_name)
	ent1_stmt.get(entry_name, function(err, entry) {
		getEntryData(entry, function() {
			//console.log(entry)
			soc.emit("updateEntries", entry);
		});
	});
}

/**
 * Retrieve the specified page from Wikipedia
 * @param entry the name of the entry
 */
var upd_stmt = db.prepare(
		"UPDATE entries " +
		"SET " +
			"pageid = ?, " +
			"content = ?, " +
			"rev_count = ?, " +
			"first_edit = ?, " +
			"last_edit = ? " +
		"WHERE entry = ?"
	);

function handleLoadEntry(entry) {
	console.log('load request for ' + entry);
	
    client.api.call({action:'query', titles:entry}, function(info, next, data) {

        /* check if the page exists */
        var pageid = Object.keys(data.query.pages).shift();

        if (pageid > 1) { /* other pageid indicate that the page does not exist or other error */

        	client.getArticle(entry, function(content) {
      			console.log('Downloaded %s (%s): %s...', entry, pageid, content.substr(0, 25).replace(/\n/g, ' '));
      			
      			/* load page revision information */
				var rev_count = 0;
				var all_revisions = [];
				var first_edit, last_edit;
				
//				getRevisionInfo(myparams, function(revisions) {
//				    if (revisions) {
//				    	rev_count += revisions.length;
//			
//				    	if (last_edit == null)
//				    		last_edit = revisions[0].timestamp;
//				    	first_edit = revisions[revisions.length - 1].timestamp;
//				    }
//				}, function() { // finalcall function
				
					/* save the page content in the database */
					upd_stmt.run( pageid, content, rev_count, first_edit, last_edit, entry, function(err){ 
						packEntryList([entry], function(msg) {
							soc.emit('updateEntries', msg);
						});
					});
				
//				});

      		});

        } else { /* page not found */
        	console.log('Page not found: ', entry, ' pageId:', pageid);
  			upd_stmt.run( pageid, null, 0, 0, 0, entry, function(err){ 
  				packEntryList([entry], function(msg) {
  					soc.emit('updateEntries', msg);
  				});
  			});
        }
        
	});
}

/**
 * Updates the root distance for specified entry if it is smaller than the saved distance.
 * 
 * @param entry entry name to update
 * @param dist new distance value
 */
var getrtd_stmt = db.prepare("SELECT dist FROM entries WHERE entry = ?"); 
var updrtd_stmt = db.prepare("UPDATE entries SET dist = ? WHERE entry = ?"); 
function setRootDist(entry, dist, callback) {
	getrtd_stmt.get( entry, function(err, old_dist) {
		if (old_dist == null || old_dist < dist) {
			callback && callback()
		} else {
			updrtd_stmt.run(dist, entry, callback);
		}
	});
}

var updcom_stmt = db.prepare("UPDATE entries SET comment = ? WHERE entry = ?");
/**
 * Updates comment field in the database
 * @param msg
 */
function handleUpdateComment(msg) {
	console.log(msg);
	updcom_stmt.run(msg.comment, msg.entry);
}


var newsrc_stmt = db.prepare("INSERT INTO cat_src (entry, src_entry) VALUES (?, ?)");
/**
 * Insert new source for the entry
 * 
 */
function insertSource(entry_name, src_entry, callback) {
	newsrc_stmt.run(entry_name, src_entry, function(err) {
		if (err) console.log("already in DB: " + entry_name + " <- " + src_entry);
		else console.log('new pair entity-source inserted: ' + entry_name + " <- " + src_entry);
		callback && callback(entry_name, src_entry) ;
	}); 
}

function finishSrcInsert(newEntries, updatedEntries, callback) {
	if (updatedEntries.length > 0) 
		packEntryList(updatedEntries, function(msg) {
			//console.log('updateEntries', msg);
			soc.emit('updateEntries', msg);
		});
	if (newEntries.length > 0)
		packEntryList(newEntries, function(msg) {
			//console.log('addEntries', msg);
			soc.emit('addEntries', msg);
		});
}

var exists_stmt = db.prepare("SELECT entry, dist FROM entries WHERE entry = ?");
var newent_stmt = db.prepare("INSERT INTO entries (entry, dist, mentions) VALUES (?, ?, 1)");

var inclnk_stmt = db.prepare("UPDATE entries SET link_count = link_count + ?, parsed = 1 WHERE entry = ?");
var incmnt_stmt = db.prepare("UPDATE entries SET mentions = mentions + 1, dist = ? WHERE entry = ?");

/**
 * Inserts a list fo new parsed out entries into a database, 
 * performs all necessary checks, emits events for update and additions
 * 
 * @param cats a list of new parsed out entries
 * @param src_entry_name the name of the entry the list was parsed out from (will be added to update list)
 */
function insertParsedEntries(cats, src_entry_name, callback) {
	
	/* retrieve source entry distance */
	exists_stmt.get( src_entry_name, function(err, dist_row) {
		var src_dist = dist_row.dist;
		
		/* increase link count */
		inclnk_stmt.run(cats.length, src_entry_name, function(err) {
		
			var newEntries = [],
				updatedEntries = [src_entry_name];
			/* for each extracted category */
			cats.forEach( function(mycat, i, ar)  {
				
				/* check if it already exists in the database */
				exists_stmt.get( mycat, function(err, row) {
					if (row) { /* entry already in the database */
						console.log('existing entity updated: ' + mycat);
						/* increase count of mentions, update distance only if current distance is less than the stored distance */
						incmnt_stmt.run( row.dist > src_dist + 1 ? src_dist + 1 : row.dist, mycat, function(err, row) {
							insertSource( mycat, src_entry_name, function(main_entry, src_entry) {
								/* add to update list */
								updatedEntries.push(main_entry);
								if (updatedEntries.length + newEntries.length - 1 == cats.length) 
									finishSrcInsert(newEntries, updatedEntries, callback);
							});
						});
					} else { /* entry is not in the database*/
						/* insert entry into db */
						newent_stmt.run(mycat, src_dist + 1, function(err) {
							console.log('new entity created: ' + mycat);
							insertSource( mycat, src_entry_name, function( main_entry, src_entry) {
								/* add entry to new entries list */
								newEntries.push(main_entry);
								if (updatedEntries.length + newEntries.length - 1 == cats.length) 
									finishSrcInsert(newEntries, updatedEntries, callback);
							});
						});
					}
				});
			});
		});
	});
}

var getcont_stmt = db.prepare("SELECT content FROM entries WHERE entry = ?");
var cat_re = new RegExp("\\[\\[(" + cat_name + "[^\\]\\|]+)(?:\\|[^\\]]+)?\\]\\]");
/**
 * Parse Wikipedia entry, insert new entries into the database
 * 
 * @param entry_name the name of the entry
 */
function handleParseEntry(entry_name) {
	console.log('parse request for ' + entry_name);
	var foundcat_count = 0;
	
	/* retrieve page content from database */
	getcont_stmt.get(entry_name, function(err, row) {

		/* parsing out categories */
		var lines = row.content.match(/[^\r\n]+/g);
		
		//console.log(lines);
		/* build an array of categories */
		var cats = [];
		for( var i = 0; i < lines.length; i++) {
			var ma = cat_re.exec(lines[i]);
			if( ma ) 
				cats.push(ma[1]);
		}
		//console.log(cats);

		insertParsedEntries(cats, entry_name);
	});
}

/**
 * Retrieve the pages that belong to a category
 * @param entry Wikipedia category name
 */
function handleLoadSubcats(entry, callback) {
	
	var category = entry.substring(cat_name.length);
	
	console.log("Retrieving category: " + category);
	client.getPagesInCategory(category, function(pages) {
		insertParsedEntries(pages.map(function(page) {
			return page.title
		}), entry, callback);
	});

}

/*** Page Revisions ***/
function getRevisionInfo(params, callback, finalcall) {
	client.api.call(params, function(info, next, data) {
		var pageid = Object.keys(data.query.pages).shift();
	    //console.log(data); //.query.pages[pageid].revisions);
	
		callback && callback(data.query.pages[pageid].revisions);
	
	    if (data["query-continue"] && data["query-continue"].revisions) {
	    	params.rvcontinue = data["query-continue"].revisions.rvcontinue;
	    	getRevisionInfo(params, callback, finalcall);
	    } else {
	    	finalcall && finalcall();
	    }
	});
}



/*** Launch Web Server ***/
console.log("Open in your browser: http://localhost:" + srv_port);
server.listen(srv_port);

/* THE END */