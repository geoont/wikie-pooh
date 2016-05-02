/**
 * Manager for Wikie-Pooh Mongo databases
 */
var conf = require("./config.json");

var mongoose = require ("mongoose"); // The reason for this demo.

// Here we find an appropriate database to connect to, defaulting to
// localhost if we don't find one.
var uristring =
  process.env.MONGOLAB_URI ||
  process.env.MONGOHQ_URL ||
  conf.dburi;

mongoose.connect(uristring);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'ERROR connecting to "' + uristring + '": ') );
db.once('open', function() {
  console.log ('Succeeded to connect to: ' + uristring);



  process.exit();
});
