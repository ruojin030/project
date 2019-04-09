var express = require('express');
var bodyParser = require('body-parser');
var uniqid = require("uniqid");
var router = express.Router();
var jsonParser = bodyParser.json()


router.get('/add',function(req,res){
    res.sendFile('/../questions.html');
});
router.post('/add',jsonParser,function(req,res){
    var user = req.body.current_user
    //var user = "FAKEUSER!"
    var db = req.app.locals.db
    const qCollection = db.collection('questions')
    console.log(req.body)
    if(req.body.current_user == null){
        return res.json({'status':'error','error':'user not login'})
    }else{
        db.collection('users').find({'username':req.body.current_user}).toArray(function(err,result){
            if(result.length!= 1){
                return res.json({'status':'error','error':'user not match'})
            }else{
                var userReputation = result[0].reputation
                if(req.body.title == null||req.body.body == null||req.body.tags == null){
                    return res.json({'status':'error','error':'wrong request type'})
                }  
                var data = {}
                data['id'] = uniqid.time();
                data['user'] = {'username':req.body.current_user,'reputation':userReputation}
                data['title'] = req.body.title
                data['body'] = req.body.body 
                data['score'] = 0
                data['views'] = []
                data['answers'] = []
                data['timestamp'] = Date.now()/1000
                data['media'] = null
                data['tags'] = req.body.tags
                data['accepted_answer_id'] = null
                //console.log(data)  
                qCollection.insertOne(data,function(err,result){
                    if (err) {
                        console.log(err);
                        res.json({'status':'error','error':'unable to insert data'})
                    }else{
                        console.log(data.id+" question inserted");
                        res.json({'status':"OK",'id':data.id})
                    }
                })
            }
        })    
    }
});

router.get('/:id',jsonParser,function(req,res){
    var qID = req.params.id
    var db = req.app.locals.db
    db.collection('questions').find({'id':req.params.id}).toArray(function(err,result){
        if(result.length != 1){
            return res.json({'status':'error','error':'question not found'})
        }
        else{
            var question = result[0]  
            var user = req.body.current_user
            //var user = "####FAKEUser!!!"
            if(user == null){ //count by IP
                user = req.connection.remoteAddress
            }
            var views = []
            console.log(question.views)
            for(var i in question.views){
                views.push(question.views[i])
            }
            var answers = []
            for(var i in question.answers){
                answers.push(question.answers[i])
            }
            if(!views.includes(user)){
                console.log("not included, views "+views)
                views.push(user)
                db.collection('questions').updateOne({'id':req.params.id }, { $set: {'views': views}}, function(err, res) {
                    if (err) throw err;
                    console.log("1 views updated");
            });
        }
        question['view_count'] = views.length
        delete question.views
        delete question._id
        delete question.answers
        question['answer_count'] = answers.length
        res.json({'status':'OK','question':question}) 
        }
    })
    
})


router.post('/:id/answers/add',jsonParser,function(req,res){
    var qID = req.params.id
    var user = req.body.current_user
    //var user = "FAKEUSER"
    var db = req.app.locals.db
    const qCollection = db.collection('questions')
    if (req.body.current_user == null){
        return res.json({'status':'error','error':'you have to login to answer'} )
    }else{
        qCollection.find({'id':req.params.id}).toArray(function(err,result){
            if(result.length!= 1){
                return res.json({'status':'error','error':'question not found'} )
            }
            else{ 
                var question = result[0]
                var answer = req.body
                answer['id'] = uniqid.time("A")
                answer['score'] = 0
                answer['user'] = req.body.current_user
                answer['is_accepted'] = false
                answer['timestamp'] = Date.now()/1000
                //console.log(answer)
                var answers = []
                for(var i in question.answers){
                    answers.push(question.answers[i])
                }
                answers.push(answer)
                qCollection.updateOne({'id':req.params.id}, {$set:{'answers':answers}},function(err, res) {
                    if (err) throw err;
                    console.log("answer "+answer.id+" updated");
                });
                res.json({'status':'OK','id':answer.id})
            }
    })
}
    
})
router.get('/:id/answers',function(req,res){
    const qID = req.params.id
    var db = req.app.locals.db
    const qCollection = db.collection('questions')
    var question = {}
    qCollection.find({'id':req.params.id}).toArray(function(err,result){
        if(result.length!= 1){
            return res.json({'status':'error','error':'question not found'} )
        }
        else{
            question = result[0]
            var answers = []
            for(var i in question.answers){
                answers.push(question.answers[i])
            }
            res.json({'status':'OK', 'answers':answers})
        }
    })
})
router.delete('/:id',function(req,res){
    //201 not login 202 incorrect id 203 user and session user not same 204 delete fail
    var db = req.app.locals.db
    if(req.body == null){
        return res.sendStatus(201)
    }
    db.collection('questions').find({'id':req.params.id}).toArray(function(err,result){
        if(result.length!= 1){
            return res.sendStatus(202)
        }else{
            var question = result[0]
            if(question.user.username != req.body.current_user){
                return res.sendStatus(203)
            }else{
                db.collection('questions').deleteOne({'id':req.params.id}, function(err,obj){
                    if(err) return res.sendStatus(204)
                    console.log(req.params.id+" question delete")
                })
            }    
        }
    })
})



module.exports = router;