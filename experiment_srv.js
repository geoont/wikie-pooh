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

/* open the database */
var sqlite3 = require('sqlite3').verbose();
console.log("Opening database: " + dbfile);
var db = new sqlite3.Database(dbfile, sqlite3.OPEN_READWRITE, function(err) {
	if (err) {
		console.error('Failed: ' + err);
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
    soc = socket;
}

function handleEntryListRequest() {
	//console.log('Entry list request, sending ' + entryList);
	db.all("SELECT * FROM stages", function(err, rows) {
		soc.emit('entryList', rows );
	});
}

console.log("Open in your browser: http://localhost:" + srv_port);
server.listen(srv_port);

/* launch sevlets for specific functions */

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

