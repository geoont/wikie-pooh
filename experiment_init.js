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
console.log("Creating database: " + dbfile);
var db = new sqlite3.Database(dbfile, sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE, function(err) {
	if (err) {
		console.error('Failed: ' + err);
		process.exit(2);
	}
});

db.serialize(function() {
	db.run("CREATE TABLE entries (" +
			"entry TEXT PRIMARY KEY, " +
			"pageid INT," + /* pageid <= 1 means that page does not exist */
			"link_count INT DEFAULT 0, " +
			"edits INT, " +
			"wiki_version INT, " +
			"content TEXT, " +
			"comment TEXT" +
			")");
	db.run("CREATE TABLE cat_src (" +
			"entry TEXT, " +
			"src_entry TEXT, " +
			"PRIMARY KEY (entry, src_entry), " +
			"FOREIGN KEY (entry) REFERENCES entries(entry)" +
			"FOREIGN KEY (src_entry) REFERENCES cat_src(entry)" +
			")");
});

/* load cats file into the database */
var stmt1 = db.prepare("INSERT INTO entries (entry, comment) VALUES (?, ?)");
var stmt2 = db.prepare("INSERT INTO cat_src (entry, src_entry) VALUES (?, '')");

var lineReader = require('line-reader');
var lines_read = 0, entries_inserted = 0;
var readline_complete = false;

function complete_loading() {
	if (readline_complete && entries_inserted == lines_read) {
		stmt1.finalize();
		stmt2.finalize();
	  
		db.each("SELECT count(*) AS cnt FROM entries", function(err, row) {
			console.log("Finished: read=" + lines_read + " inserted=" + entries_inserted + " table_rows=" + row.cnt);
		});
	
		db.close();
	}
}

console.log("Reading category list...");
lineReader.eachLine(init_cats, function(line, last) {

  //console.log(line);
  
  /* skip comments and empty lines */
  line = line.replace(/#.*$/, '');
  if (line.match(/^\s*$/)) return;

  var entry = line.split("\t")[0].trim();

  var comment = '';
  if (entry.match(/^-/)) {
	comment = 'ignore';
  	entry = entry.substring(1);
  }

  lines_read++;
  
  stmt1.run(entry, comment, function() { 
	  ++entries_inserted;
	  //if (comment != '')
		  stmt2.run(entry);
	  complete_loading();
  });
}).then(function() {
	readline_complete = true;
	complete_loading();
});



