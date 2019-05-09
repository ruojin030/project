var express = require('express');
const app = express()
var bodyParser = require('body-parser');
var Memcached = require('memcached');
const MongoClient = require('mongodb').MongoClient;
const mongo_address = 'mongodb://192.168.122.39:27017';
var jsonParser = bodyParser.json()
const esindex = "test"

const port = 3001
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
    host: '130.245.171.61:9200'
});

var memcached = new Memcached('localhost:11211');

app.post('/search', jsonParser, function (req, res) {
    //console.log("nobody nobody but u <3")
    var db = req.app.locals.db
    var must = []
    console.log("timestamps:" + req.body.timestamp + "\t limit:" + req.body.limit + "\t accepted:" + req.body.accepted + "\t q:" + req.body.q)
    if (req.body.timestamp == null) {
        req.body.timestamp = Date.now() / 1000 | 0
    }
    must.push({ range: { timestamp: { "lte": req.body.timestamp } } })
    if (req.body.limit == null) {
        req.body.limit = 25
    }

    if (req.body.limit > 100) {
        req.body.limit = 100
    }
    if (req.body.q != null && req.body.q != "") {
        must.push({ match: { title: req.body.q } })
        must.push({ match: { body: req.body.q } })
    } else {
        must.push({ match_all: {} })
    }
    sort_q = {}
    if (req.body.sort_by == null || req.body.sort_by == "score") {
        sort_q = "score:desc"
    } else {
        sort_q = "timestamp:desc"
    }
    if (req.body.accepted) {
        must.push({ exist: { field: accepted_answer_id } })
    }
    if (req.body.has_media) {
        must.push({ match: { has_media: true } })
    }
    if (req.body.tags != null) {
        must.push({ match: { tags: { query: req.body.tags.join(' '), "operator": "and" } } })
    }
    client.search({
        index: esindex,
        size: req.body.limit,
        sort: sort_q,
        body: { query: { bool: { "must": must } } }
    }).then(function (resp) {
        var hits = resp.hits.hits;
        console.log("es found:" + hits.length);
        var resultID = []
        for (var i in hits) {
            resultID.push(hits[i]._id);
        }
        db.collection('questions').find({ "id": { $in: resultID } }).toArray(function (err, result) {
            if (err) console.log("question found err:"+err);
            var questions = []
            console.log("mongodb found " + result.length)
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
                /*  memcached.get(question.user,function(err,data){
                     if(err) console.log(err)
                     console.log(data)
                     if(data!=null){
                         console.log("cache!")
                         question.user = data   
                         questions.push(question)
                     }else{
                         console.log("no cache :(") */
                db.collection('users').find({ 'username': question.user }).toArray(function (err, result) {
                    if (err) console.log("db found error "+err)
                    if (result.length != 1) {
                        res.status(404)
                        console.log("user not found found "+result.length)
                        return res.json({ 'status': 'error', 'error': 'user not found' })
                    }
                    console.log(result.length)
                    if (result[0].reputation < 1) {
                        result[0].reputation = 1
                    }
                    question.user = { 'username': result[0].username, 'reputation': result[0].reputation }
                    
                    /*memcached.set(question.user,{ 'username': result[0].username, 'reputation': result[0].reputation }
                    , 10, function (err) {
                        if(err) console.log("cache error:"+err)
                        else console.log("cache "+ question.user+ " success")
                    })
                })
            }
        })    */
                })
            }
            questions.push(question)
            res.json({ 'status': 'OK', 'questions': questions })
        })
    })
});

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
