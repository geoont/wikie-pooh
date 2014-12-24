/**
 * Server with experiment results
 */

/* process arguments */
'use strict';

var args = process.argv.slice(2);
if (args.length != 2) {
	console.error("usage: node " + process.argv[1] + " <language> <expertiment.sqlite3>\n" +
		"  where\n    <language> is Wikipedia language code (en, zh, ru, etc.)\n" +
		"    <expertiment.sqlite3> sqlite 3 database to be fixed\n") ;
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
		console.error('Unable to connect to database: ' + err);
		process.exit(2);
	}
});

db.serialize();

/* check if database structure should be updated */
db.get("SELECT * FROM entries", function(err, row) {
	if ('ign' in row) {
		console.log("ign column detected, no update needed");
	} else {
		console.log("update: adding 'ign' column");
		db.exec("ALTER TABLE entries ADD COLUMN ign BOOLEAN DEFAULT 0");
	}
	if ('cats_loaded' in row) {
		console.log("cats_loaded column detected, no update needed");
	} else {
		console.log("update: adding 'cats_loaded' column");
		db.exec("ALTER TABLE entries ADD COLUMN cats_loaded BOOLEAN DEFAULT 0");
	}
});
//.exec("UPDATE entries SET entry = replace(entry, '''', '&#39;')");

/* THE END */