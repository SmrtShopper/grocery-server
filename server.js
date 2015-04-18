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

//enable CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


app.post('/addGrocery', function(request, response) {
	var login = request.body.login;
	var grocery = request.body.grocery;
	var date = new Date();

	db.collection('grocery', function(error1, coll) {

		var id = coll.update({login:login}, {$set:{grocery:grocery, created_at: date}}, {upsert:true}, function(error2, saved) {
			if (!login || !grocery || error1) {
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

app.listen(process.env.PORT || 3000);
