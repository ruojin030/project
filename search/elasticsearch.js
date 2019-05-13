var express = require('express');
const app = express()
var bodyParser = require('body-parser');
var Memcached = require('memcached');
const MongoClient = require('mongodb').MongoClient;
const mongo_address = 'mongodb://192.168.122.47:27017';
var jsonParser = bodyParser.json()
var Memcached = require('memcached');
var memcached = new Memcached('localhost:11211');
const esindex = "pro.questions"

const port = 3001
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
    host: '130.245.171.61:9200'
});

var memcached = new Memcached('localhost:11211');

app.post('/search', jsonParser, function (req, res) {
    //console.log("nobody nobody but u <3")
    if (req.body.limit == null) {
        req.body.limit = 25
    }
    if (req.body.limit > 100) {
        req.body.limit = 100
    }
    if ((req.body.q == null || req.body.q == "") && req.body.timestamp == null &&( req.body.sort_by == null||req.body.sort_by =="score") && req.body.accepted == null && req.body.has_media == null && req.body.tags == null) {
        memcached.get("null", function (err, data) {
            if (err) console.log(err)
            if (data != null) {
                console.log("cached!!!!")
                d = data.slice(0, req.body.limit)
                return res.json({ 'status': 'OK', 'questions': d })
            } else {
                console.log("$$$$$need cached$$$$$")
                client.search({
                    index: esindex,
                    size: 100,
                    sort: "score:desc",
                    body: { query: { match_all: {} } }
                }).then(function (resp) {
                    var hits = resp.hits.hits;
                    var questions = []
                    for (var i in hits) {
                        questions.push(hits[i]._source);
                    }
                    memcached.add('null', questions, 10)
                    que = questions.slice(0, req.body.limit)
                    res.json({ 'status': 'OK', 'questions': que })
                })
            }
        })
    } else {
        
        req.body.boo = {}
        req.body.must = []
        console.log("timestamps:" + req.body.timestamp + "\t limit:" + req.body.limit + "\t accepted:" + req.body.accepted + "\t q:" + req.body.q)
        if (req.body.timestamp == null) {
            req.body.timestamp = Date.now() / 1000 | 0
        }
        req.body.must.push({ range: { timestamp: { "lte": req.body.timestamp } } })


        if (req.body.q != null && req.body.q != "") {
            req.body.boo['filter'] = { multi_match: { "query": req.body.q, "fields": ["title", "body"] } }
        } else {
            req.body.must.push({ match_all: {} })
        }
        console.log(req.body.q)
        sort_q = {}
        if (req.body.sort_by == null || req.body.sort_by == "score") {
            sort_q = "score:desc"
        } else {
            sort_q = "timestamp:desc"
        }
        if (req.body.accepted) {
            req.body.must.push({ exists: { field: "accepted_answer_id" } })
        }
        if (req.body.has_media) {
            req.body.must.push({ match: { has_media: true } })
        }
        if (req.body.tags != null) {
            req.body.must.push({ match: { tags: { query: req.body.tags.join(' '), "operator": "and" } } })
        }
        client.search({
            index: esindex,
            size: req.body.limit,
            sort: sort_q,
            body: { query: { bool: req.body.boo } }
        }).then(function (resp) {
            var hits = resp.hits.hits;
            console.log("es found:" + hits.length);
            var questions = []
            for (var i in hits) {
                questions.push(hits[i]._source);
            }
            res.json({ 'status': 'OK', 'questions': questions })
        })
    }
});

/* MongoClient.connect(mongo_address, (err, client) => {
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
 */
app.listen(port, () => console.log(`Example app listening on port ${port}!`))
module.exports = app;
