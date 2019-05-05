var express = require('express');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const mongo_address = 'mongodb://192.168.122.39:27017';
var cookieParser = require('cookie-parser');

const port = 3000


app.use(cookieParser());


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

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
module.exports = app;