/**
 * Initializes experiment
 */

/* process two arguments */
var path = require('path');
var args = process.argv.slice(2);
if (args.length != 2) {
	console.error("\ncreates a new database and loads initial list of categories\n" + 
		"usage: node " + path.basename(process.argv[1]) + " <input_list.cats> <expertiment.sqlite3>\n" +
		"  where\n" +
		"    <input_list.cats> is a file with an initial list of pages and categories\n" +
		"    <expertiment.sqlite3> sqlite 3 database to be created\n") ;
	process.exit(1);
}

var dbfile    = args[1],
    init_cats = args[0];

/* stop if database already exists */
var fs = require("fs");
if (fs.existsSync(dbfile)) {
	console.error("database file '" + dbfile + "' already exists, exiting..");
	process.exit(2);
}

/* create database tables */
var sqlite3 = require('sqlite3').verbose();
console.log("Creating database: " + dbfile + "\n");
var db = new sqlite3.Database(dbfile, sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE, function(err) {
	if (err) console.error('Failed: ' + err);
});

db.serialize(function() {
  db.run("CREATE TABLE stages (stage INT, action CHAR(1), entry TEXT, src_stage INT, src_entry TEXT, PRIMARY KEY (stage, entry))");
  db.run("CREATE TABLE entries (entry TEXT PRIMARY KEY, edits INT, wiki_version INT, content TEXT)");
});

/* load cats file into the database */
var stmt = db.prepare("INSERT INTO stages (action, stage, entry) VALUES (?, 0, ?)");

var lineReader = require('line-reader');

lineReader.eachLine(init_cats, function(line, last) {

  //console.log(line);
  
  /* skip comments and empty lines */
  line = line.replace(/#.*$/, '');
  if (line.match(/^\s*$/)) return;

  var entry = line.split("\t")[0].trim();

  var action = null;
  if (entry.match(/^-/)) {
	action = '-';
  	entry = entry.substring(1);
  }

  stmt.run(action, entry, function(err) {
	  if (last) {
		  stmt.finalize();
		  
		  db.each("SELECT count(*) AS cnt FROM stages", function(err, row) {
			  console.log("Entries loaded: " + row.cnt);
		  });
		  
		  db.close();
	  }
  });
})


