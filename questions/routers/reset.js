var express = require('express');
var router = express.Router();  
router.get('/',function(req,res){
    console.log("you success")
    var db = req.app.locals.db
    db.collection('answers').remove({})
    db.collection('questions').remove({})
    db.collection('users').remove({})
    db.collection('medias').remove({})
    res.json({"status":"ok"})
})
module.exports = router;