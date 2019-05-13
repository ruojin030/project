var express = require('express');
var router = express.Router();  
router.get('/',function(req,res){
    console.log("reset success")
    var db = req.app.locals.db
    var mdeia = req.app.locals.media_db
    media_db.collection('users').remove({})
    media_db.collection('medias').remove({})
    db.collection('answers').remove({},function(err,result){
        db.collection('questions').remove({},function(err,result){
            db.collection('users').remove({},function (err, result){
                db.collection('medias').remove({},function(err,result){
                    res.json({'status':'OK'})
                })
            })
        })
    })
    
    
   
   
})
module.exports = router;