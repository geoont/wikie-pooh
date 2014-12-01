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
    soc = socket;
}

/*** SERVLETS ***/

/**
 * Send a list of Wikipedia entries to the browser 
 */

var ents_stmt = db.prepare("SELECT * FROM entries");
var ent1_stmt = db.prepare("SELECT * FROM entries WHERE entry = ?");
var srcs_stmt = db.prepare("SELECT src_entry FROM cat_src WHERE entry = ?");

/**
 * Queries the database to retrieve information about specific entry.
 * 
 * @param entry a hash of entry data, will be modified
 * @param callback (entry)
 */
function getEntryData(entry, callback) {
	/* reduce content size to 1024 characters */
	if (entry.content && entry.content.length > 1024)
		entry.content = entry.content.substring(0, 1024) + '...';
	
	srcs_stmt.all(entry.entry, function(err, all_srcs) {
		if (all_srcs.length > 0) {
			var src_list = [];
			for (var j = 0; j < all_srcs.length; j++) {
				src_list.push( all_srcs[j].src_entry );
			}
			entry['sources'] = src_list;
		}
		callback && callback(entry);
	});
	
}

function handleEntryListRequest() {
	//console.log('Entry list request, sending ' + entryList);
	var srcqcnt = 0;
	ents_stmt.all( function(err, entry_list) {
		for (var i = 0; i < entry_list.length; i++) {
			getEntryData(entry_list[i], function() {
				srcqcnt++;
				if (srcqcnt == entry_list.length)
					soc.emit('entryList', entry_list );
			});
		}
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
			'uri' : wiki_uri
		})
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
			soc.emit("updateEntry", entry);
		})
	})
}

/**
 * Retrieve the specified page from Wikipedia
 * @param entry the name of the entry
 */
var upd_stmt = db.prepare("UPDATE entries SET pageid = ?, content = ? WHERE entry = ?");
function handleLoadEntry(entry) {
	console.log('load request for ' + entry);
	
    client.api.call({action:'query', titles:entry}, function(info, next, data) {

        /* check if the page exists */
        var pageid = Object.keys(data.query.pages).shift();

        if (pageid > 1) { /* other pageid indicate that the page does not exist or other error */

        	client.getArticle(entry, function(content) {
      			console.log('Downloaded %s (%s): %s...', entry, pageid, content.substr(0, 25).replace(/\n/g, ' '));
      			/* save the page content in the database */
      			upd_stmt.run( pageid, content, entry, function(err){ handleUpdateEntry(entry) } );
      		});

        } else { /* page not found */
        	console.log('Page not found: ', entry, ' pageId:', pageid);
  			upd_stmt.run( pageid, null, entry, function(err){ handleUpdateEntry(entry) } );
        }
        
	});
}

var updcom_stmt = db.prepare("UPDATE entries SET comment = ? WHERE entry = ?");
function handleUpdateComment(msg) {
	console.log(msg);
	updcom_stmt.run(msg.comment, msg.entry);
}

/**
 * Parse Wikipedia entry, insert new entries into the database
 * 
 * @param entry the name of the entry
 */
var getcont_stmt = db.prepare("SELECT content, link_count FROM entries WHERE entry = ?");
var updlnk_stmt = db.prepare("UPDATE entries SET link_count = ? WHERE entry = ?");
var newent_stmt = db.prepare("INSERT INTO entries (entry) VALUES (?)");
var newsrc_stmt = db.prepare("INSERT INTO cat_src (entry, src_entry) VALUES (?, ?)");
var cat_re = new RegExp("\\[\\[(" + cat_name + "[^\\]\\|]+)(?:\\|[^\\]]+)?\\]\\]");
function handleParseEntry(entry_name) {
	console.log('parse request for ' + entry_name);
	var foundcat_count = 0;
	
	/* retrieve page content from database */
	getcont_stmt.get(entry_name, function(err, row) {

		/* parsing out categories */
		var lines = row.content.match(/[^\r\n]+/g);
		
		//console.log(lines);
		for( var i = 0; i < lines.length; i++) {
			//console.log(lines[i]);
			//var re = /\[\[(Category:[^\]]+)\]\]/;
			var ma = cat_re.exec(lines[i]);
			if( ma ) {
				console.log(ma[1]);
				foundcat_count++;
				
				/* update link counts of the current entry current entry */
				updlnk_stmt.run(row.link_count + 1, entry_name, function() {
					
					/* check if we already have extracted entry in our database */
					getcont_stmt.get(ma[1], function(err, ma_row) {
						/* insert new entry into database and then new source record */
						if (!ma_row)
							newent_stmt.run(ma[1], function() {
								newsrc_stmt.run(ma[1], entry_name, function(err) {})
							});
						else
							newsrc_stmt.run(ma[1], entry_name, function(err) {})
					});
					//handleUpdateEntry(entry_name);
				});
				
			}
    	}
		
	});

	/* update entry list and count in WUI */
}

/*** Launch Web Server ***/
console.log("Open in your browser: http://localhost:" + srv_port);
server.listen(srv_port);

/* THE END */