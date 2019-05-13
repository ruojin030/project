var express = require('express');
const app = express()
var bodyParser = require('body-parser');
var elasticsearch = require('elasticsearch');
var uniqid = require("uniqid");
var jsonParser = bodyParser.json()
var client = new elasticsearch.Client({
    host: '130.245.171.61:9200',
    log:"trace"
});
const port = 3001
const esIndex = "test"
app.post('/add',jsonParser,function(req,res){
    var id1 = uniqid()
    req.body.id = id1.toString
    client.index({index:esIndex,body:req.body,id:id1})
    res.send("OK")
})
app.post('/delete',function(req,res){
    client.deleteByQuery({index:"test",body:{query:{match_all:{}}}})
    //client.delete({index:"test",id:"yyu3fbrjvg8nswl"})
})
app.post('/delete/:id',function(req,res){
    client.delete({index:"test",id:req.params.id})
})
app.post('/search',jsonParser,function(req,res){
    client.search({index:"test", body:{query:{match:{title:req.body.q}}},sort: "score:desc" })
})


app.listen(port, () => console.log(`Example app listening on port ${port}!`))
module.exports = app;