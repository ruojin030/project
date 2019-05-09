var express = require('express');
var router = express.Router();  
router.get('/',function(req,res){
    console.log("reset success")
    var db = req.app.locals.db
    db.collection('answers').remove({},function(err,result){
        db.collection('questions').remove({},function(err,result){
            db.collection('users').remove({},function (err, result){
                db.collection('medias').remove({},function(err,result){
                    req.app.locals.es.deleteByQuery({index:"test", body:{query:{match_all:{}}}}).then(function(resp){
                        res.json({"status":"OK"})
                    })       
                })
            })
        })
    })
})
module.exports = router;