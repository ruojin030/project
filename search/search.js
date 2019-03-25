var express = require('express');
const app = express()
const MongoClient = require('mongodb').MongoClient;
const mongo_address = 'mongodb://130.245.171.133:27017';
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json()

const port = 3001

app.get('/',function(req,res){
    res.send("hello!")
})

app.post('/search',jsonParser,function(req,res){
    console.log("nobody nobody but u <3")
    var timestamp = req.body.timestamp
    var limit = req.body.limit
    var accepted = req.body.accepted
    
    //console.log("timestamps " + timestamp +"\nlimit "+ limit +"\naccepted "+ accepted)
    if(timestamp == null){
        timestamp =  Date.now()/1000 |0
    }
    if(limit == null){
        limit =25
    }
    if(limit >100){
        limit = 100
    }
    if(typeof accepted != "boolean"){
        accepted = false
    }
    var db = req.app.locals.db
    if(accepted){
        db.collection('questions').find({ 'timestamp': { $lt: timestamp },'accepted_answer_id':{$ne:null} })
        .limit(limit).sort({'timestamp':-1}).toArray(function(err,result){
            if (err) throw err; 
            var questions = [] 
            for(var i in result){
                var question = result[i]
                var views = []
                for(var i in question.views){
                    views.push(question.views[i])
                }
                var answers = []
                for(var i in question.answers){
                    answers.push(question.answers[i])
                }
                question['view_count'] = views.length
                delete question.views
                delete question._id
                delete question.answers
                question['answer_count'] = answers.length
                questions.push(question)
            }
            res.json({'status':'OK', 'questions':questions})
        })
    }else{
        db.collection('questions').find({ 'timestamp': { $lt: timestamp }}).limit(limit).sort({'timestamp':-1}).toArray(function(err,result){
            if (err) throw err;  
            var questions = [] 
            for(var i in result){
                var question = result[i]
                var views = []
                for(var i in question.views){
                    views.push(question.views[i])
                }
                var answers = []
                for(var i in question.answers){
                    answers.push(question.answers[i])
                }
                question['view_count'] = views.length
                delete question.views
                delete question._id
                delete question.answers
                question['answer_count'] = answers.length
                questions.push(question)
            }
            res.json({'status':'OK', 'questions':questions})  
        })
    }
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