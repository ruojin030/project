var express = require('express');
const app = express()
const MongoClient = require('mongodb').MongoClient;
const mongo_address = 'mongodb://192.168.122.24:27017';
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json()
var sleep = require('sleep');

const port = 3001

app.get('/', function (req, res) {
    res.send("hello!")
})

app.post('/search', jsonParser, function (req, res) {
    //console.log("nobody nobody but u <3")
    var timestamp = req.body.timestamp
    var limit = req.body.limit
    var accepted = req.body.accepted
    var q = req.body.q

    console.log("timestamps " + req.body.timestamp + "\t limit:" + req.body.limit + "\t accepted:" + req.body.accepted + "\t q:" + req.body.q)
    if (req.body.timestamp == null) {
        req.body.timestamp = Date.now() / 1000 | 0
    }
    if (req.body.limit == null) {
        req.body.limit = 25
    }
    if (req.body.limit > 100) {
        req.body.limit = 100
    }
    if (typeof req.body.accepted != "boolean") {
        req.body.accepted = false
    }
    var db = req.app.locals.db
    var query = { 'timestamp': { $lt: req.body.timestamp } }
    if (req.body.accepted) {
        query.accepted_answer_id = { $ne: null }
    }
    if (req.body.q != null && req.body.q != "") {
        query.$text = { $search: req.body.q, $language: "none" }//$diacriticSensitive: false,$caseSensitive: false}//{$search:q}//
        console.log(query)
    }

    db.collection('questions').find(query).limit(req.body.limit).sort({ 'timestamp': 1 }).toArray(function (err, result) {
        if (err) throw err;
        console.log("THE NUM OF RESULT IS " + result.length)
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

        res.json({ 'status': 'OK', 'questions': questions })
    })

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