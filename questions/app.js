var express = require('express');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const mongo_address = 'mongodb://192.168.122.50:27017';
const media_address = 'mongodb://192.168.122.28:27017'
const user_address = 'mongodb://192.168.122.48:27017'
var cookieParser = require('cookie-parser');
var Memcached = require('memcached');
var memcached = new Memcached('localhost:11211');

const port = 3000


app.use(cookieParser());


app.locals.memcached = memcached
var questions = require("./routers/questions")
var answers = require("./routers/answers")
var reset = require("./routers/reset")

app.use('/questions',questions)
app.use('/answers',answers)
app.use('/reset',reset)
app.get('/',function(req, res){
    res.send("hello")
})


MongoClient.connect(mongo_address, (err, client) => {
    // ... start the server
    if(err){
        console.log(err);
    }else{
        console.log("success connet to db");
    }
    db = client.db('pro');
    //console.log(db);
    app.locals.db = db;
    db.collection("questions").createIndex({'title':"text",'body':"text"},{default_language: "none"}  )
  })
  MongoClient.connect(media_address, (err, client) => {
    // ... start the server
    if(err){
        console.log(err);
    }else{
        console.log("success connet to db");
    }
    media_db = client.db('pro');
    //console.log(db);
    app.locals.media_db = media_db;
  })
  MongoClient.connect(user_address, (err, client) => {
    // ... start the server
    if(err){
        console.log(err);
    }else{
        console.log("success connet to db");
    }
    user_db = client.db('pro');
    //console.log(db);
    app.locals.user_db = user_db;
  })

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
module.exports = app;