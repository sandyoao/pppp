var express = require("express");
var app = express();
var session = require("cookie-session");

app.use(express.static(__dirname + "/public"));

var MongoClient = require("mongodb").MongoClient;
var assert = require("assert");
var ObjectId = require("mongodb").ObjectID;
var mongourl = "mongodb://demo:demo@ds157187.mlab.com:57187/project123456";
var bodyParser = require("body-parser");
var fileUpload = require('express-fileupload');
app.use(bodyParser.urlencoded({extended:true}));
app.use(fileUpload());
app.use(bodyParser.json());

app.set("view engine", "ejs");

app.use(session({
	name: "session",
	keys: ["key1", "key2"],
	maxAge: 5 * 60 * 1000,
	secret: "pass",
	resave: true,
	saveUninitialized: true
}));

function checksession(session){
    if(session == undefined)
        return false;
    else
        return true;
}

app.get("/login", function(req,res){
    if(checksession(req.session.username) == false){
        session = req.session;
        res.sendFile(__dirname + "/login.html");
    }
    else{
        res.redirect("/read");
    }
});


app.get("/", function(req,res){
	if(checksession(req.session.username) == false){
            res.redirect("/login");
        }
        else{
		res.redirect("/read");
	}
});

//login ###OK
app.post("/login", function(req,res) {
         /*var user = [{
          userid:"demo",
          password:"demo"
          }];*/
	MongoClient.connect(mongourl,function(err,db) {
		if(err){
			throw err;
		}
		else{
			db.collection("users").findOne({userid:req.body.userid,password:req.body.password}, function(err, data){
				assert.equal(err,null);
				if(data){
					req.session.authenticated = true;
					req.session.username = req.body.userid;
					console.log("Login success");
					res.redirect("/read");
					db.close();
				}
				else{
					res.render("result",{r:"Incorrect username or password"});
				}
			});
		}
	});
});

//reg ###OK
app.get("/reg", function(req,res){
	res.sendFile(__dirname + "/reg.html");
});

app.post("/reg", function(req,res){
	console.log("reg");
	
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log("Connected to MongoDB");
                     
		var n = {};
		n['userid'] = (req.body.userid != null) ? req.body.userid : null;
		n['password'] = (req.body.password != null) ? req.body.password : null;
			
		var criteria = {"userid": req.body.userid};

		findReg(db,criteria,function(reg){		
			if(reg != null && reg.userid == req.body.userid){
				res.render("result",{r:"Account already exists"});
				res.end();
			}
			else{
	                     	register(db,n,function(restaurant){
				db.close();
				console.log("Disconnected MongoDB\n");
				res.render("result",{r:"Registration successful!"});
				res.end();
				});
			}
		});
		
	});
});

function findReg(db,criteria,callback) {
	db.collection('users').findOne(criteria,function(err,result) {
		assert.equal(err,null);
		callback(result);
	});
}

function register(db,reg,callback) {
	db.collection('users').insertOne(reg,function(err,result) {
		console.log("insert successful");
		assert.equal(err,null);
		callback(result);
	});
}

//new  ###OK
app.get("/new", function(req,res){
	if(checksession(req.session.username) == false){
            res.redirect("/login");
        }
        else{
            res.sendFile(__dirname + "/new.html");
        }
});

app.post("/new", function(req,res){
         if(checksession(req.session.username) == false){
         	res.redirect("/login");
         }
         else{

         	console.log("new");
         	MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			console.log("Connected to MongoDB");
	                     
			var n = {};
	                     
			n['name'] = (req.body.name != null) ? req.body.name : null;
			n['borough'] = (req.body.borough != null) ? req.body.borough : null;
			n['cuisine'] = (req.body.cuisine != null) ? req.body.cuisine : null;
			n['address'] = {};
			n.address.street = (req.body.street != null) ? req.body.street : null;
			n.address.building = (req.body.building != null) ? req.body.building : null;
			n.address.zipcode = (req.body.zipcode != null) ? req.body.zipcode : null;
	                     
			n.address['coordinates'] = [];
			n.address.coordinates.push(req.body.lon);
 			n.address.coordinates.push(req.body.lat);
	                     
			n['rating'] = [];
	                     
			if(req.files.photo.data != null){
				n['data'] = new Buffer(req.files.photo.data).toString('base64');
				n['mimetype'] = req.files.photo.mimetype;
			}
	                     
			n['createdBy'] = req.session.username;
	                     
			console.log(n);
			create(db,n,function(restaurant){
				db.close();
				console.log("Disconnected MongoDB\n");
				res.render("create",{r:restaurant});
				res.end();
			});
		});
         }
});

function create(db,newrest,callback) {
	db.collection('restaurant').insertOne(newrest,function(err,result) {
		console.log("insert successful");
		assert.equal(err,null);
		callback(result);
	});
}


//read   ###OK
app.get("/read", function(req,res) {
	if(checksession(req.session.username) == false){
		res.redirect("/login");
        }
        else{
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			console.log("Connected to MongoDB\n");
			var criteria = {};
	
			console.log(criteria);
			findNRestaurant(db,criteria,function(restaurant) {
				db.close();
				console.log("Disconnected MongoDB\n");
				console.log(criteria);
				res.render("list",{r:restaurant, c:criteria, user:req.session.username});
				//console.log(restaurant);
				//res.end();
			});
			
    		});
	}
});

app.post("/read", function(req,res) {
        if(checksession(req.session.username) == false){
        res.redirect("/login");
        }
        else{
        MongoClient.connect(mongourl, function(err, db) {
                            assert.equal(err,null);
                            console.log("Connected to MongoDB\n");
                            var criteria = {};
                            if (req.body.name != null && req.body.name != "") {
                            criteria["name"] = req.body.name;
                            }
                            if (req.body.borough != null && req.body.borough != "") {
                            criteria["borough"] = req.body.borough;
                            }
                            if (req.body.cuisine != null && req.body.cuisine != "") {
                            criteria["cuisine"] = req.body.cuisine;
                            }
                            
                            console.log(criteria);
                            findNRestaurant(db,criteria,function(restaurant) {
                                            db.close();
                                            console.log("Disconnected MongoDB\n");
                                            console.log(criteria);
                                            res.render("list",{r:restaurant, c:criteria, user:req.session.username});
                                            //console.log(restaurant);
                                            //res.end();
                                            });
                            
                            });
        }
});


function findNRestaurant(db,criteria,callback) {
	var restaurant = [];
	db.collection("restaurant").find(criteria,function(err,result) {
		assert.equal(err,null);
		result.each(function(err,doc) {
			assert.equal(err,null);
			if (doc != null) {
				restaurant.push(doc);
			}
			else{
				callback(restaurant);
			}
		});
	})
}

//gmap   ###OK
app.get("/gmap", function(req,res) {
	if(checksession(req.session.username) == false){
		res.redirect("/login");
	}
	else{
		console.log("gmap")
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			res.render("gmap",{name:req.query.title,lat:req.query.lat,lon:req.query.lon,zoom:18});
			res.end();
		});
	}
});


//display  ###OK
app.get("/display", function(req,res) {
	if(checksession(req.session.username) == false){
		res.redirect("/login");
	}
	else{
		console.log("display");
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			console.log("Connected to MongoDB\n");
			var criteria = {"_id": ObjectId(req.query.id)};
			console.log(criteria);
			find1Restaurant(db,criteria,function(restaurant) {
				db.close();
				console.log("Disconnected MongoDB\n");
				console.log(restaurant);
				res.render("details",{r:restaurant});
				res.end();
			});
		
		});
	}
});

function find1Restaurant(db,criteria,callback) {
	db.collection("restaurant").findOne(criteria,function(err,result) { 				  
		assert.equal(err,null);
		callback(result);
	});
}

//rate  ###OK
app.get("/rate", function(req,res) {
	if(checksession(req.session.username) == false){
		res.redirect("/login");
	}
	else{
		console.log("rate");
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			console.log("Connected to MongoDB\n");
			res.render("rate",{id:ObjectId(req.query.id)});
			res.end();
		});
	}
});

app.post("/rate", function(req,res) {
	console.log("rate post");
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log("Connected to MongoDB\n");
		//check is rated
		var IsRate = {"_id": ObjectId(req.query.id) ,"rating" : {'$elemMatch': {"userid" : req.session.username}}};
		find1Restaurant(db,IsRate,function(restaurant) {
			//db.close();
			//console.log("Disconnected MongoDB\n");
			console.log(restaurant);
			if (restaurant != null) {
				db.close();
				console.log("rated");
				res.render("result",{r:"Restaurant has been rated"});
				res.end();
			}
			else{
				var criteria = {"_id": ObjectId(req.query.id)};
				var set1 = {'$push':{"rating":{ "grade":req.body.score, "userid":req.session.username }}};
				console.log(criteria);
				console.log(set1);
				update1Restaurant(db,criteria,set1,function(restaurant) {
					db.close();
					console.log("Disconnected MongoDB\n");
					console.log(restaurant);
					res.redirect("/display?id="+req.query.id);
					res.end();
				});

			}
		});
	});
});

function update1Restaurant(db,criteria,set1,callback) {
	db.collection("restaurant").update(criteria,set1,function(err,result) {
		assert.equal(err,null);
		console.log(set1);
		callback(result);
	});
}

//change ###OK
app.get("/change", function(req,res) {
	if(checksession(req.session.username) == false){
		res.redirect("/login");
	}
	else{
		console.log("change");
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			console.log("Connected to MongoDB\n");
			var criteria = {"_id": ObjectId(req.query.id)};
			find1Restaurant(db,criteria,function(restaurant) {
				if(restaurant.createdBy != req.session.username){
					res.render("result",{r:"You are not authorized to edit!!"});
				}
				else{
					db.close();
					console.log("Disconnected MongoDB\n");
					res.render("edit",{r:restaurant,id:ObjectId(req.query.id)});
					res.end();
				}
			});
		});
	}
});

app.post("/change", function(req,res) {
	if(checksession(req.session.username) == false){
		res.redirect("/login");
	}
	else{
		console.log("change post");
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			console.log("Connected to MongoDB\n");
			var criteria = {"_id": ObjectId(req.query.id)};
			//find1Restaurant(db,criteria,function(restaurant) {
                                         
			var n = {};
                                            
			n['name'] = (req.body.name != null) ? req.body.name : null;
			n['borough'] = (req.body.borough != null) ? req.body.borough : null;
			n['cuisine'] = (req.body.cuisine != null) ? req.body.cuisine : null;
			n['address'] = {};
			n.address.street = (req.body.street != null) ? req.body.street : null;
			n.address.building = (req.body.building != null) ? req.body.building : null;
			n.address.zipcode = (req.body.zipcode != null) ? req.body.zipcode : null;
                                            
			n.address['coordinates'] = [];
			n.address.coordinates.push(req.body.lon);
			n.address.coordinates.push(req.body.lat);
                                            
			if(req.files.photo.data != null && req.files.photo.data != ""){
				n['data'] = new Buffer(req.files.photo.data).toString('base64');
				n['mimetype'] = req.files.photo.mimetype;
			}
                                        
			console.log(n);
			//var criteria = {"_id": ObjectId(req.query.id)};
			var set1 = {'$set': n};
                                            
			update1Restaurant(db,criteria,set1,function(restaurant) {
				db.close();
				console.log("Disconnected MongoDB\n");
				console.log(restaurant);
				res.redirect("/display?id="+req.query.id);
				res.end();
			});
				//});
		});
	}
});


//delete  ###OK
app.get("/remove", function(req,res) {
	if(checksession(req.session.username) == false){
		res.redirect("/login");
	}
	else{
		console.log("delete");
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			console.log("Connected to MongoDB\n");
			var criteria = {"_id": ObjectId(req.query.id)};
			console.log(criteria);
			find1Restaurant(db,criteria,function(restaurant) {
				var createname = {"_id": ObjectId(req.query.id),createdBy:restaurant.createdBy};
                                            
				if(restaurant.createdBy == req.session.username){
					deleteR(db,createname,function(rest) {
						db.close();
						console.log("Disconnected MongoDB\n");
						res.render("result",{r:"Delete was successful"});
						res.end();
					}); 
				}
				else
					res.render("result",{r:"You are not authorized to delete!!"});                   
			});
		});
	}
});

function deleteR(db,delRest,callback) {
	db.collection('restaurant').deleteOne(delRest,function(err,result) {
		console.log("delete successful");
		assert.equal(err,null);
		callback(result);
	});
}



//restful

app.get('/api/read/:c/:x', function(req,res){
	c=req.params.c;
	x=req.params.x;
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log("Connected to MongoDB\n");
		var sValue = { [c] : x };
		console.log(sValue);
		findNRestaurant(db,sValue,function(restaurant) {
			db.close();
			console.log("Disconnected MongoDB\n");
			res.json(restaurant);
			res.end();
		});
	});
})

app.post('/api/create', function(req,res){
	MongoClient.connect(mongourl, function(err, db) {
		var n = {};
                     
		n['name'] = (req.body.name != null) ? req.body.name : null;
		n['borough'] = (req.body.borough != null) ? req.body.borough : null;
		n['cuisine'] = (req.body.cuisine != null) ? req.body.cuisine : null;
		n['address'] = {};
		n.address.street = (req.body.street != null) ? req.body.street : null;
		n.address.building = (req.body.building != null) ? req.body.building : null;
		n.address.zipcode = (req.body.zipcode != null) ? req.body.zipcode : null;
                     
		n.address['coordinates'] = [];
		n.address.coordinates.push(req.body.lon);
		n.address.coordinates.push(req.body.lat);
		n['rating'] = [];

		n['data'] = (req.body.data != null) ? req.body.data : null;
		n['mimetype'] = (req.body.mimetype != null) ? req.body.mimetype : null;

		n['createdBy'] = req.body.createdBy;

		assert.equal(err,null);
		create(db,n,function(restaurant){
			db.close();
			console.log("Disconnected MongoDB\n");
			res.json(restaurant.ops[0]);
			res.end();
		});
	});

});

app.get("/logout", function(req,res){
        console.log(session);
        req.session = null;
        console.log(session);
        res.redirect('/login');
});



var port = (process.env.VCAP_APP_PORT || 8099);
var host = (process.env.VCAP_APP_HOST || 'localhost');

app.listen(port,host, function() {
	console.log('Server running...');
});

