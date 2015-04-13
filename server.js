// Initialization
var express = require('express');
var bodyParser = require('body-parser');
var validator = require('validator'); // See documentation at https://github.com/chriso/validator.js
var app = express();
// See https://stackoverflow.com/questions/5710358/how-to-get-post-query-in-express-node-js
app.use(bodyParser.json());
// See https://stackoverflow.com/questions/25471856/express-throws-error-as-body-parser-deprecated-undefined-extended
app.use(bodyParser.urlencoded({ extended: true }));

// Mongo initialization and connect to database
var mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/nodemongoexample';
var MongoClient = require('mongodb').MongoClient, format = require('util').format;
var db = MongoClient.connect(mongoUri, function(error, databaseConnection) {
	db = databaseConnection;
});


app.post('/addGrocery', function(request, response) {
	var login = request.body.login;
	var itemId = request.body.itemId;
	var date = new Date();


	db.collection('grocery', function(error1, coll) {

		var id = coll.update({login:login}, {$set:{itemId:itemId, created_at: date}}, {upsert:true}, function(error2, saved) {
			if (!itemId || !login || error1) {
				response.send("{'error':'Whoops, something is wrong with your data!'}");
			}
			else { 
				db.collection('grocery').find({}).toArray(function(err, results){
					response.send(results);
				});
			}
	    });
	});
});

app.get('/grocery.json', function(request, response) {
	db.collection('grocery').find({login:request.query.login}).toArray(function(err, results){
					response.send(results);
	});
});

app.get('/', function(request, response) {
	response.set('Content-Type', 'text/html');
	var indexPage = '';
	var options = {
		"sort":"created_at"
	};
	db.collection('grocery', function(er, collection) {
		collection.find({}, options).toArray(function(err, cursor) {
			if (!err) {
				indexPage += "<!DOCTYPE HTML><html><head><title>Groceries Added</title></head><body><h1>Groceries Added</h1>";
				for (var count = (cursor.length - 1); count >= 0; count--) {
					indexPage += "<p>"+ cursor[count].login +" added " + cursor[count].itemId + " at "+ cursor[count].created_at + "</p>";
				}
				indexPage += "</body></html>"
				response.send(indexPage);
			} else {
				response.send('<!DOCTYPE HTML><html><head><title>MMAP</title></head><body><h1>Whoops, something went terribly wrong!</h1></body></html>');
			}
		});
	});
});


// Oh joy! http://stackoverflow.com/questions/15693192/heroku-node-js-error-web-process-failed-to-bind-to-port-within-60-seconds-of
app.listen(process.env.PORT || 3000);
