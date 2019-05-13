var express = require('express');
var router = express.Router();  
router.get('/',function(req,res){
    console.log("reset success")
    var db = req.app.locals.db
    var media_db = req.app.locals.media_db
    var user_db = req.app.locals.user_db
    user_db.collection('users').remove({})
    media_db.collection('medias').remove({})
    db.collection('answers').remove({},function(err,result){
        db.collection('questions').remove({},function(err,result){
                    res.json({'status':'OK'})
        })
    })
    
    
   
   
})
module.exports = router;