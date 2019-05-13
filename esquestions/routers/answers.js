var express = require('express');
var bodyParser = require('body-parser');
var uniqid = require("uniqid");
var cookieParser = require('cookie-parser');
var router = express.Router();
var jsonParser = bodyParser.json()

router.post('/:id/upvote',jsonParser,function(req,res){
    var db = req.app.locals.db
    if (req.cookies == undefined || req.cookies.session == undefined||req.cookies.session.current_user == undefined){
        return res.json({'status':'error','error':'user not login'})
    }
    if(req.body.upvote == null){
        req.body.upvote =true
    }
    db.collection('answers').find({'id':req.params.id}).toArray(function(err,result){
        if(err) console.log(err)
        if(result.length != 1){
            return res.json({'status':'error','error':'answer not found'})
        }
        var voters = result[0].voters
        var changed = 0
        var user = result[0].user
        var his = voters[req.cookies.session.current_user]
        if(his == null && req.body.upvote){ //upvote
            changed ++
            voters[req.cookies.session.current_user] = 1
            console.log("upvote")
        }else if(his == null && !req.body.upvote){ //downvote
            changed --
            voters[req.cookies.session.current_user] = -1
            console.log("downvote")
        }else if(his == 1 && req.body.upvote){ //undo upvote
            changed --
            delete voters[req.cookies.session.current_user]
            console.log("undo upvote")
        }else if(his == 1 && !req.body.upvote){ //changed upvote to downvote
            changed -=2
            voters[req.cookies.session.current_user] = -1
            console.log("changed upvote to downvote")
        }else if(his == -1 && !req.body.upvote){ //undo downvote
            changed ++
            delete voters[req.body.upvote]
            console.log("undo downvote")
        }else if(his == -1 &&req.body.upvote){//changed downvote to upvote
            changed +=2
            voters[req.cookies.session.current_user] = 1
            console.log("changed downvote to upvote")
        }
        db.collection('answers').updateOne({'id':req.params.id},{$set:{'voters':voters,'score':result[0].score+changed},function(err,result){
            if(err) console.log(err)
            //console.log('voter update success')
        }})
        db.collection('users').updateOne({'username':user},{$inc:{'reputation':changed}},function(err,result){
            if(err) console.log(err)
            console.log(user + " reputation "+ changed)
        })
        /* db.collection('users').updateOne({'username':user},{$max:{'reputation':1}},function(err,result){
            if(err) console.log(err)
            //console.log('try to fix gt 1')
        }) */
        res.json({'status':"OK"})
    })
})

router.post('/:id/accept',jsonParser,function(req,res){
    if (req.cookies == undefined || req.cookies.session == undefined||req.cookies.session.current_user == undefined){
        return req.json({'status':'error','error':'not login'})
    }
    db.collection('answers').find({'id':req.params.id}).toArray(function(err,result){
        if(err) return res.json({'status':'error'})
        if(result.length!= 1){
            return res.json({'status':'error','error':'wrong id'})
        }
        var qid = result[0].questionID
        db.collection('questions').find({'id':qid}).toArray(function(err,result){
            if(err) console.log(err)
            if(result[0].accepted_answer_id == null && result[0].user== req.cookies.session.current_user){
                db.collection('questions').updateOne({'id':qid},{$set:{'accepted_answer_id':req.params.id}},function(err,result){
                    //console.log('question accepted answer success')
                })
                db.collection('answers').updateOne({'id':req.params.id},{$set:{'is_accepted':true}},function(err,res){
                    if(err) console.log(err)
                    //console.log('answer accepted success')
                })
                res.json({'status':'OK'})
            }
            else{
                return res.json({'status':'error','error':'already accepted or not the asker'})
            }
        })
    })
})


module.exports = router;