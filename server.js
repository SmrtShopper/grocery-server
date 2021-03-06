// Initialization
var express = require('express');
var bodyParser = require('body-parser');
var validator = require('validator'); // See documentation at https://github.com/chriso/validator.js
var jquery = require('jquery');
var requester = require('request');
var uuid = require('uuid');
 
var app = express();
// See https://stackoverflow.com/questions/5710358/how-to-get-post-query-in-express-node-js
app.use(bodyParser.json());
// See https://stackoverflow.com/questions/25471856/express-throws-error-as-body-parser-deprecated-undefined-extended
app.use(bodyParser.urlencoded({ extended: true }));

// Mongo initialization and connect to database
var mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL|| 'mongodb://localhost/grocery';
var MongoClient = require('mongodb').MongoClient, format = require('util').format;
var db = MongoClient.connect(mongoUri, function(error, databaseConnection) {
	db = databaseConnection;
});

var error_msg = "{}";

//enable CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/checkUID', function(request,response){
	response.set('Content-Type', 'text/plain');
	var uid = request.query.login;
	if (!uid) {
			response.send("0"); //doesn't exists
	}
	else {
		docs = db.collection('grocery').find({login:uid});
		docs.count(function(error, num) {
			response.send(num.toString()); //1 if exists, 0 if does not
		});

	}
	
});

app.get('/getUID', function(request,response){
	var uid = uuid.v1();
	db.collection('grocery').insert({login:uid}, function(error2, saved) {
		response.send(uid);
	});
});

app.post('/addGrocery', function(request, response) {
	response.set('Content-Type', 'application/json');
	var login = request.body.login;
	var grocery = request.body.grocery;
	var date = new Date();

	db.collection('grocery', function(error1, coll) {
		var allitemstr;
		if (!login || !grocery || error1) {
			response.send(error_msg);
		}
		else { 
			//get from nutritionix
			coll.find({"login": login}).toArray(function(err, results) {
				if (results[0] != undefined && results[0].grocery != undefined && results[0].grocery != '\n') {
					allitemstr = grocery + '\n' + results[0].grocery;
				}
				else {
					allitemstr = grocery;
				}
				var appId = "feab83eb";
     			var appKey = "ecc75d64bf6a77ba3f03d478d4ee943e";
				requester.post({
					  headers: {
				                "X-APP-ID" : appId,
				                "X-APP-KEY" : appKey,
				                "Content-Type" : "text/plain"
				              },
					  url:     'https://api.nutritionix.com/v2/natural/',
					  body:    allitemstr
					}, function(error, data, body){
						if (JSON.parse(data.body).errors == null){
							var id = db.collection('grocery').update({login:login}, {$set:{data:body, grocery:allitemstr, created_at: date}}, {upsert:true}, function(error2, saved) {
								response.send(data.body);
							});
						}
						else {
							//dont add unknown item
							response.send({'error' : 'item not found'});
						}
					});
				});
	    	};
	});
});

app.post('/deleteGrocery', function(request, response) {
	response.set('Content-Type', 'application/json');
	var login = request.body.login;
	var idx = request.body.idx;
	var date = new Date();

	db.collection('grocery', function(error1, coll) {
		var allitemstr;
		if (!login || !idx || error1) {
			response.send(error_msg);
		}
		else { 
			db.collection('grocery', function(error1, coll) {
				coll.find({"login": login}).toArray(function(err, results) {
					if (results[0]){
						input = JSON.parse(results[0].data).results;
						if (input){
							var allitemstr = '';
							for (var i = 0; i < input.length; i++) {
								if (idx != i){ //dont concat item to be removed
									if (allitemstr != undefined || '\n') {
										allitemstr = input[i].parsed_query.query + '\n' + allitemstr;
									}else {
										allitemstr = input[i].parsed_query.query;
									}
								}
					        }

							console.log(allitemstr);
							//get result from nutritionix
							var appId = "feab83eb";
			     				var appKey = "ecc75d64bf6a77ba3f03d478d4ee943e";
							requester.post({
								  headers: {
							                "X-APP-ID" : appId,
							                "X-APP-KEY" : appKey,
							                "Content-Type" : "text/plain"
							              },
								  url:     'https://api.nutritionix.com/v2/natural/',
								  body:    allitemstr
								}, function(error, data, body){
									if (JSON.parse(body).errors == null){
										if (JSON.parse(body).error_message) {
											body = "{}";
										}
										var id = db.collection('grocery').update({login:login}, {$set:{data:body, grocery:allitemstr, created_at: date}}, {upsert:true}, function(error2, saved) {
											response.send(body);
										});
									}
									else {
										//dont add unknown item
										response.send({'error' : 'item not found'});
									}
							});
						}else {
							response.send("{}");
						}
						
					}
					else {
						response.send("{}");
					}
				});
			});
		}
	});
});

app.post('/deleteAll', function(request, response) {
	response.set('Content-Type', 'application/json');
	var login = request.body.login;
	var date = new Date();

	db.collection('grocery', function(error1, coll) {
		if (!login || error1) {
			response.send(error_msg);
		} 
		else {
			var id = db.collection('grocery').update({login:login}, {$set:{data:"{}", grocery:"", created_at: date}}, {upsert:true}, function(error2, saved) {
				response.send("{}");
			});
		}
	});
});

app.get('/getGrocery', function(request, response) {
	response.set('Content-Type', 'application/json');
	var login = request.query.login;
	if (!login) {
				response.send(error_msg);
	}
	else {
		db.collection('grocery', function(error1, coll) {
			coll.find({"login": login}).toArray(function(err, results) {
				if (results[0] && results[0].data){
					response.send(results[0].data);
				}
				else {
					response.send("{}");
				}
			});
		});
	}
});

app.get('/sendSMS', function(request, response) {
	response.set('Content-Type', 'application/json');
	var login = request.query.login;
	var phone = request.query.phone;
	var url = request.query.url;
	if (!login || !phone || !url) {
				response.send(error_msg);
	}
	else {
			allitemstr = '';
			db.collection('grocery', function(error1, coll) {
			coll.find({"login": login}).toArray(function(err, results) {
				if (results[0] != undefined && results[0].grocery != undefined && results[0].grocery != '\n') {
						allitemstr = results[0].grocery;
				}
				allitemstr += '\n' + url;
				requester.post({
						  url:     "http://textbelt.com/text",
						  form:    {number:phone, message:allitemstr}
						}, function(error, data){
							if (JSON.parse(data.body).success == true){
								response.send("success");
							}else {
								response.send("failure");
							}
						});
				});
			});
	    }
});

app.listen(process.env.PORT || 3000);
