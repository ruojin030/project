var express = require('express');
const app = express()
var bodyParser = require('body-parser');
var await = require("await")
var jsonParser = bodyParser.json()


var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
    host: '130.245.171.61:9200'
});

const port = 3000

app.post('/search', jsonParser, function (req, res) {
    var q = req.body.q
    client.search({
        "index": "test", "body": {
            "query": {
                "bool": {
                    must:{
                        match:{title:q},
                        match:{body:q}
                    },
                    filter:{
                        terms:{
                            "tags":["1","2","3"],
                            "minimum_should_match":3
                        }
                    }
                }
            }
        }
    }).then(function (resp) {
        var hits = resp.hits.hits;
        console.log(hits.length);
        for (var i in hits) {
            console.log(hits[i]._source);
        }
        res.send("OK")
    })
});
app.get('/delete', jsonParser, function (req, res) {
    client.deleteByQuery({index:"test",body:{query:{match_all:{}}}}).then(function(resp){
        res.send("success")
    }    
    )

})

app.post('/add', jsonParser, function (req, res) {
    client.index({ index: "test", body: req.body })
    res.send("OK")
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
module.exports = app;