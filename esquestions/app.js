var express = require('./node_modules/express');
const app = express();
const MongoClient = require('./node_modules/mongodb').MongoClient;
const mongo_address = 'mongodb://192.168.122.39:27017';
var cookieParser = require('./node_modules/cookie-parser');
var elasticsearch = require('elasticsearch')

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
var client = new elasticsearch.Client({
    host: '130.245.171.61:9200',
    log:"trace"
});
app.locals.es = client
app.listen(port, () => console.log(`Example app listening on port ${port}!`))
module.exports = app;