/**
 * Server with experiment results
 */

/* process arguments */

/* open the database */

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

var entryList =  [{'flag' : ' ', 'entry' : 'entry1', 'reason' : 'xxx', 'sources' : [ {'src' : 'Page', 'url' : 'http:', 'cnt' : 1} ]}];
function handleEntryListRequest() {
    //console.log('Entry list request, sending ' + entryList);
    soc.emit('entryList', entryList );
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

