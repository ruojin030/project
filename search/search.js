var express = require('express');
const app = express()
const MongoClient = require('mongodb').MongoClient;
const mongo_address = 'mongodb://192.168.122.47:27017';
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json()
var Memcached = require('memcached');
var memcached = new Memcached('localhost:11211');
const port = 3001



app.get('/', function (req, res) {
    res.send("hello!")
})

app.post('/search', jsonParser, function (req, res) {
    var db = req.app.locals.db
    //console.log("nobody nobody but u <3"
    //console.log("timestamps:" + req.body.timestamp + "\tlimit:" + req.body.limit + "\taccepted:" + req.body.accepted + "\tq:" + req.body.q + "\tmedia:" + req.body.has_media + "\tsort:" + req.body.sort_by)
    if (req.body.limit == null) {
        req.body.limit = 25
    }
    sort_q = {}
    if (req.body.sort_by == null || req.body.sort_by == "score") {
        sort_q = { "score": -1 }
        req.body.sort_by = "score"
    } else {
        sort_q = { "timestamp": -1 }
        req.body.sort_by = "timestamp"
    }
    if ((req.body.q == null || req.body.q == "") && req.body.timestamp == null  && req.body.accepted == null && req.body.has_media == null) {
        memcached.get(req.body.sort_by, function (err, data) {
            if (err) console.log(err)
            if (data != null) {
                console.log(req.body.sort_by+" cached!!!!")
                d = data.slice(0, req.body.limit)
                return res.json({ 'status': 'OK', 'questions': d })
            } else {
                console.log("$$$$$need cached$$$$$")
                db.collection('questions').find({}).limit(100).sort(sort_q).toArray(function (err, result) {
                    if (err) console.log(err)
                    var questions = []
                    for (var i in result) {
                        var question = result[i]
                        var views = []
                        for (var i in question.views) {
                            views.push(question.views[i])
                        }
                        var answers = []
                        for (var i in question.answers) {
                            answers.push(question.answers[i])
                        }
                        question['view_count'] = views.length
                        delete question.views
                        delete question._id
                        delete question.answers
                        question['answer_count'] = answers.length
                        questions.push(question)
                    }
                    memcached.add(req.body.sort_q, questions, 5, function (err) { if (err) console.log(err) })
                    que = questions.slice(0, req.body.limit)
                    res.json({ 'status': 'OK', 'questions': que })
                })
            }
        })
    } else {
        console.log("timestamps:" + req.body.timestamp + "\tlimit:" + req.body.limit + "\taccepted:" + req.body.accepted + "\tq:" + req.body.q + "\tmedia:" + req.body.has_media + "\tsort:" + req.body.sort_by)
        if (req.body.timestamp == null) {
            req.body.timestamp = Date.now() / 1000 | 0
        }

        if (req.body.limit > 100) {
            req.body.limit = 100
        }

        if (typeof req.body.accepted != "boolean") {
            req.body.accepted = false
        }

        var query = { 'timestamp': { $lt: req.body.timestamp } }

        if (req.body.accepted) {
            query.accepted_answer_id = { $ne: null }
        }
        if (req.body.tags != null) {
            query.tags = { $all: req.body.tags }
        }
        if (req.body.has_media) {
            query.has_media = true
        }
        if (req.body.q != null && req.body.q != "") {
            query.$text = { $search: req.body.q, $language: "none" }//$diacriticSensitive: false,$caseSensitive: false}//{$search:q}//
            //console.log(query)
        }

        db.collection('questions').find(query).limit(req.body.limit).sort(sort_q).toArray(function (err, result) {
            if (err) throw err;
            //console.log("THE NUM OF RESULT IS " + result.length)
            var questions = []
            for (var i in result) {
                var question = result[i]
                var views = []
                for (var i in question.views) {
                    views.push(question.views[i])
                }
                var answers = []
                for (var i in question.answers) {
                    answers.push(question.answers[i])
                }
                question['view_count'] = views.length
                delete question.views
                delete question._id
                delete question.answers
                question['answer_count'] = answers.length
                /*db.collection('users').find({ 'username': question.user }).toArray(function (err, result) {
                    if (err) console.log(err)
                    if(result.length!=1){
                        res.status(404)
                        console.log("user not found")
                        return res.json({ 'status': 'error', 'error': 'user not found'})
                    }
                    if(result[0].reputation<1){
                        result[0].reputation = 1
                    }
                    question.user = { 'username': result[0].username, 'reputation': result[0].reputation }
                })*/
                questions.push(question)

            }
            //if(req.body.q =="")
            res.json({ 'status': 'OK', 'questions': questions })
        })
    }
})




MongoClient.connect(mongo_address, (err, client) => {
    // ... start the server
    if (err) {
        console.log(err);
    } else {
        console.log("success connet to db");
    }
    db = client.db('pro');
    //console.log(db);
    app.locals.db = db;
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
module.exports = app;