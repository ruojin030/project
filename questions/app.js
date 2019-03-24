var express = require('express');
const app = express()
const MongoClient = require('mongodb').MongoClient;
const mongo_address = 'mongodb://130.245.171.133:27017';
const cookieSession = require('cookie-session');

const port = 80

app.use(cookieSession({
    name: 'session',
    keys: ['lalala'],
  }))

var questions = require("./routers/questions")

app.use('/questions',questions)
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
  })

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
module.exports = app;