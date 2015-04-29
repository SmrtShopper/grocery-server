// Initialization
var express = require('express');
var bodyParser = require('body-parser');
var validator = require('validator'); // See documentation at https://github.com/chriso/validator.js
var jquery = require('jquery');
var requester = require('request');

var app = express();
// See https://stackoverflow.com/questions/5710358/how-to-get-post-query-in-express-node-js
app.use(bodyParser.json());
// See https://stackoverflow.com/questions/25471856/express-throws-error-as-body-parser-deprecated-undefined-extended
app.use(bodyParser.urlencoded({ extended: true }));

// Mongo initialization and connect to database
var mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL|| 'mongodb://localhost/nodemongoexample';
var MongoClient = require('mongodb').MongoClient, format = require('util').format;
var db = MongoClient.connect(mongoUri, function(error, databaseConnection) {
	db = databaseConnection;
});

var error_msg = { "error": "Whoops, something is wrong with your data!"};

//enable CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.post('/addGrocery', function(request, response) {
	response.set('Content-Type', 'application/json');
	var login = request.body.login;
	var grocery = request.body.grocery;
	var date = new Date();

	db.collection('grocery', function(error1, coll) {

		var id = coll.update({login:login}, {$set:{grocery:grocery, created_at: date}}, {upsert:true}, function(error2, saved) {
			if (!login || !grocery || error1) {
				response.send(error_msg);
			}
			else { 
				//get from nutritionix
				var appId = "feab83eb";
     			var appKey = "ecc75d64bf6a77ba3f03d478d4ee943e";
     			console.log(request);
				requester.post({
				  headers: {
			                "X-APP-ID" : appId,
			                "X-APP-KEY" : appKey,
			                "Content-Type" : "text/plain"
			              },
				  url:     'https://api.nutritionix.com/v2/natural/',
				  body:    grocery
				}, function(error, data, body){
				  response.send(data.body);
				});
				// db.collection('grocery').find({}).toArray(function(err, results){
				// 	response.send(results);
				// });
			}
	    });
	});
});

app.get('/getGrocery', function(request, response) {
	var login = request.query.login;
	db.collection('grocery', function(error1, coll) {
		coll.find({"login": login}).toArray(function(err, results) {
			response.send(results);
		});
	});
});

app.listen(process.env.PORT || 3000);
