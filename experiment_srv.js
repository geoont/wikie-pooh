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

var wiki_srv = lang + '.wikipedia.org';
var wiki_uri = 'http://' + wiki_srv + '/wiki/';

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

var soc;
function onConnect(socket) {
    socket.on('getEntryList', handleEntryListRequest);
    socket.on('getPgtitle', handlePgtitleRequest);
    socket.on('loadEntry', handleLoadEntry);
    socket.on('parseEntry', handleParseEntry);
    soc = socket;
}

function handleLoadEntry(entry) {
	console.log('load request for ' + msg);
	soc.emit("updateEntry", entry);
}

function handleParseEntry(entry) {
	console.log('parse request for ' + msg);
}

var ents_stmt = db.prepare("SELECT * FROM entries");
var srcs_stmt = db.prepare("SELECT src_entry FROM cat_src WHERE entry = ?");

function handleEntryListRequest() {
	//console.log('Entry list request, sending ' + entryList);
	var srcqcnt = 0;
	ents_stmt.all( function(err, entry_list) {
		for (var i = 0; i < entry_list.length; i++) {
			var entry = entry_list[i];
			
			srcs_stmt.all(entry.entry, function(err, all_srcs) {
				if (all_srcs.length > 0) {
					var src_list = [];
					for (var j = 0; j < all_srcs.length; j++) {
						src_list.push( all_srcs[j].src_entry );
					}
					entry['sources'] = src_list;
				}
				srcqcnt++;
				if (srcqcnt == entry_list.length)
					soc.emit('entryList', entry_list );		
			});
		}
	});
}

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

console.log("Open in your browser: http://localhost:" + srv_port);
server.listen(srv_port);

/* launch servlets for specific functions */

/*** SERVLETS ***/

/**
 * Send a list of Wikipedia entries to the browser 
 */

/**
 * Receive toggled skip flag and save it in the database 
 */

/**
 * Retrieve and parse entries from Wikipedia, insert then into the database
 */

