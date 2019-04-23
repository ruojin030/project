var express = require('express');
var router = express.Router();  
router.get('/reset',function(req,res){
    var db = req.app.locals.db
    db.collection('answers').remove()
    db.collection('questions').remove()
    db.collection('users').remove()
    res.json({"status":"ok"})
})
module.exports = router;