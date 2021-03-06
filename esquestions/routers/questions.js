var express = require('express');
var bodyParser = require('body-parser');
var uniqid = require("uniqid");
var router = express.Router();
var jsonParser = bodyParser.json()
var path = require('path');
var cookieParser = require('cookie-parser');
var request = require("request")


router.get('/', function (req, res) {
    res.sendFile(path.resolve('../questions/questions.html'));
});
router.post('/add', jsonParser, function (req, res) {
    var db = req.app.locals.db
    var media_db = req.app.locals.media_db
    var memcached = req.app.locals.memcached
    var es = req.app.locals.es
    //console.log(req)
    if (req.cookies == undefined || req.cookies.session == undefined || req.cookies.session.current_user == undefined) {
        res.status(403)
        console.log('user not login')
        return res.json({ 'status': 'error', 'error': 'user not login' })
    } else {
        if (req.body.title == null || req.body.body == null || req.body.tags == null) {
            console.log("body miss part")
            res.status(405)
            return res.json({ 'status': 'error', 'error': 'wrong request type' })
        }
        var data = {}
        if (req.body.media == null) {
            req.body.media = []
            data['has_media'] = false
        } else {
            data['has_media'] = true
        }
        data['id'] = uniqid();
        data['user'] = req.cookies.session.current_user
        data['title'] = req.body.title
        data['body'] = req.body.body
        data['score'] = 0
        data['views'] = []
        data['answers'] = []
        data['timestamp'] = Date.now() / 1000
        data['media'] = req.body.media
        data['tags'] = req.body.tags
        data['accepted_answer_id'] = null
        data['upvoters'] = []
        data['downvoters'] = []
        var eData = {'id':data['id'],'user':req.cookies.session.current_user,'title':req.body.title,'body':req.body.body,'score':0,'has_media':true}
        if(req.body.media == null||req.body.media.length==0){
            eData.has_media = false
        }
        media_db.collection("medias").find({ "poster": req.cookies.session.current_user, "used": false }).toArray(function (err, result) {
            if (result == null && req.body.media.length != 0) {
                res.status(406)
                console.log("no media can be add")
                return res.json({ 'status': 'error', 'error': 'media error' })
            } else {
                m = []
                for (i in result) {
                    m.push(result[i].id)
                }
                correct = true
                for (i in req.body.media) {
                    if (!m.includes(req.body.media[i])) {
                        correct = false
                        console.log("media " + req.body.media[i] + " been used")
                    }
                }
                if (!correct) {
                    res.status(406)
                    return res.json({ 'status': 'error', 'error': 'media error' })
                } else {
                    if(req.body.media!=0){
                    media_db.collection("medias").updateMany({ "id": {$in:req.body.media} }, { $set: { "used": true } })
                    }
                    db.collection('questions').insertOne(data)
                    es.index({index:'test',body:eData,id:data['id']})
                    d = {}
                    d['user'] = req.cookies.session.current_user
                    d['media'] = req.body.media
                    memcached.add(data.id,d,600,function(err){
                       if(err) console.log(err)
                    })
                    //console.log(data['id'] + " add success by " + req.cookies.session.current_user)
                    res.json({ 'status': "OK", 'id': data.id })
                }
            }
        })

    }
});

router.get('/:id', jsonParser, function (req, res) {
    var db = req.app.locals.db
    var user_db = req.app.locals.user_db
    db.collection('questions').find({ 'id': req.params.id }).toArray(function (err, result) {
        if (result.length != 1) {
            res.status(404)
            //console.log('cannot found question with id ' + req.params.id)
            return res.json({ 'status': 'error', 'error': 'question not found' })
        }
        else {
            var question = result[0]
            var views = []
            //console.log(question.views)
            for (var i in question.views) {
                views.push(question.views[i])
            }
            var answers = []
            for (var i in question.answers) {
                answers.push(question.answers[i])
            }
            if (req.cookies == undefined || req.cookies.session == undefined || req.cookies.session.current_user == undefined) { //count by IP
                //console.log("not login use ip: " + req.headers['x-forwarded-for'] + " QID is " + req.params.id)
                if (!views.includes(req.headers['x-forwarded-for'])) {
                    //console.log("ip not included")
                    views.push(req.headers['x-forwarded-for'])
                    db.collection('questions').updateOne({ 'id': req.params.id }, { $set: { 'views': views } }, function (err, res) {
                        if (err) throw console.log(err);
                        //console.log("1 views updated");
                    });
                }
            }
            else {
                //console.log(req.cookies.session.current_user + " get question " + req.params.id)
                //console.log(req.cookies.session.current_user + " getQuestion " + req.params.id)
                if (!views.includes(req.cookies.session.current_user)) {
                    //console.log(req.cookies.session.current_user + " not included, views " + views)
                    views.push(req.cookies.session.current_user)
                    db.collection('questions').updateOne({ 'id': req.params.id }, { $set: { 'views': views } }, function (err, res) {
                        if (err) throw console.log(err);
                        //console.log("1 views updated");
                    });
                }
            }
            question['view_count'] = views.length
            question['views'] = views
            delete question._id
            delete question.answers
            question['answer_count'] = answers.length
            user_db.collection('users').find({ 'username': question.user }).toArray(function (err, result) {
                if (err) console.log(err)
                if (result[0].reputation < 1) {
                    result[0].reputation = 1
                }
                question.user = { 'username': result[0].username, 'reputation': result[0].reputation }
                res.json({ 'status': 'OK', 'question': question })
            })
        }
    })

})


router.post('/:id/answers/add', jsonParser, function (req, res) {
    //console.log("add answers")
    var db = req.app.locals.db
    var memcached = req.app.locals.memcached
    if (req.cookies == undefined || req.cookies.session == undefined || req.cookies.session.current_user == undefined) {
        res.status(404)
        console.log("user not login")
        return res.json({ 'status': 'error', 'error': 'you have to login to answer' })
    } else {
        var answer = req.body
        const id = uniqid("A")
        if (req.body.media == null) {
            req.body.media = []
            answer['has_media'] = false
        } else {
            answer['has_media'] = true
        }
        answer['id'] = id
        answer['score'] = 0
        answer['user'] = req.cookies.session.current_user
        answer['is_accepted'] = false
        answer['timestamp'] = Date.now() / 1000
        answer['media'] = req.body.media
        answer['voters'] = {}
        answer['questionID'] = req.params.id
        media_db.collection("medias").find({ "poster": req.cookies.session.current_user, "used": false }).toArray(function (err, result) {
            if (result == null && req.body.media.length != 0) {
                res.status(404)
                console.log("no media can add.")
                return res.json({ 'status': 'error', 'error': 'media error' })
            } else {
                m = []
                for (i in result) {
                    m.push(result[i].id)
                }
                correct = true
                for (i in req.body.media) {
                    if (!m.includes(req.body.media[i])) {
                        correct = false
                        console.log("cannot find media with id " + req.body.media[i])
                    }
                }
                if (!correct) {
                    res.status(404)
                    return res.json({ 'status': 'error', 'error': 'media error' })
                } else {
                    //db.collection("medias").updateMany({ "id":{$in:req.body.media} }, { $set: { "used": true } })
                    memcached.get(req.params.id,function(err,data){
                        if(err) console.log(err)
                        if(data != null){
                            db.collection('questions').updateOne({ 'id': req.params.id }, { $push: { 'answers': id } })
                            if(req.body.media.length!= 0){
                                media_db.collection("medias").updateMany({ 'id': {$in:req.body.media} }, { "used": true })
                            }
                            db.collection('answers').insertOne(answer, function (err, res) {
                                if (err) console.log(err)
                            })
                            //console.log("answer add success by " + req.cookies.session.current_user + " to " + req.params.id)
                            res.json({ 'status': 'OK', 'id': id })    
                        }
                        else{
                            db.collection('questions').find({ 'id': req.params.id }).toArray(function (err, result) {
                                if (result.length != 1) {
                                    res.status(404)
                                    console.log("question " + req.params.id + "not found")
                                    return res.json({ 'status': 'error', 'error': 'question not found' })
                                }
                                else {
                                    db.collection('questions').updateOne({ 'id': req.params.id }, { $push: { 'answers': id } })
                                    if(req.body.media.length!= 0){
                                        media_db.collection("medias").updateMany({ 'id': {$in:req.body.media} }, { "used": true })
                                    }
                                    db.collection('answers').insertOne(answer, function (err, res) {
                                        if (err) console.log(err)
                                    })              
                                    //console.log("answer add success by " + req.cookies.session.current_user + " to " + req.params.id)
                                    res.json({ 'status': 'OK', 'id': id })
                                }
                            })
                        }
                    })       
                }
            }
        })
    }
})
router.get('/:id/answers', function (req, res) {
    var db = req.app.locals.db
    db.collection('answers').find({ 'questionID': req.params.id }).toArray(function (err, result) {
        if (err) console.log(err);
        else {
            //console.log("get answers of " + req.params.id)
            return res.json({ 'status': 'OK', 'answers': result })
        }
    })
})


router.delete('/:id', jsonParser, function (req, res) {
    //need to delete the media
    media = []
    var db = req.app.locals.db
    var memcached = req.app.locals.memcached
    if (req.cookies == undefined || req.cookies.session == undefined || req.cookies.session.current_user == undefined) {
        res.status(403)
        console.log("delete not login")
        return res.json({ 'status': 'error', 'error': 'not login' })
    }
    //console.log(req.cookies.session.current_user)
    memcached.get(req.params.id,function(err,data){
        if(err){
            console.log(err)
        }else{
            if(data != null){
            if(data['user'] == req.cookies.session.current_user){
                for (i in data['media']) {
                    media.push(data['media'][i])
                }
                db.collection('questions').deleteOne({ 'id': req.params.id }, function (err, obj) {
                    if (err) {
                        console.log("delete failded")
                        res.sendStatus(405)
                    }
                    db.collection('answers').find({ 'questionID': req.params.id }).toArray(function (err, r) {
                        if (r != null) {
                            if (r.length != 0) {
                                for (j in r) {
                                    for (i in r[j].media) {
                                        media.push(r[j].media[i])
                                    }
                                }
                                db.collection('answers').deleteMany({ 'questionID': req.params.id })
                                memcached.del(req.params.id,function(err){
                                    if(err) console.log(err)
                                })
                            }
                        }
                        request({
                            url: 'http://192.168.122.35:3000/deletemedia',
                            method: 'POST',
                            json: { 'media': media }
                        }/* , function (err, resp, body1) {
                            if (err) {
                                return res.sendStatus(406)
                            }
                            else {
                                if (body1.status == 'error') {
                                    console.log('media delete error')
                                    return res.sendStatus(407)
                                } else {
                                    return res.sendStatus(200)
                                }
                            }
                        } */);
                        return res.sendStatus(200)
                    })
                })
            }
            else{
                console.log("not poster")
                return res.sendStatus(409)
            }
        }
            else{
                db.collection('questions').find({ 'id': req.params.id }).toArray(function (err, result) {
                    if (result.length != 1) {
                        console.log(req.params.id + " not found")
                        return res.sendStatus(408)
                    } else {
                        var question = result[0]
                        if (question.user != req.cookies.session.current_user) {
                            console.log("poster wrong")
                            return res.sendStatus(409)
                        } else {
                            for (i in result[0].media) {
                                media.push(result[0].media[i])
                            }
                            db.collection('questions').deleteOne({ 'id': req.params.id }, function (err, obj) {
                                if (err) {
                                    console.log("delete failded")
                                    res.sendStatus(405)
                                }
                                db.collection('answers').find({ 'questionID': req.params.id }).toArray(function (err, r) {
                                    if (r != null) {
                                        if (r.length != 0) {
                                            for (j in r) {
                                                for (i in r[j].media) {
                                                    media.push(r[j].media[i])
                                                }
                                            }
                                            db.collection('answers').deleteMany({ 'questionID': req.params.id })
                                            memcached.del(req.params.id,function(err){
                                                if(err) console.log(err)
                                            })                                            
                                        }
                                    }
                                    //console.log(req.params.id + " deleted success")
                                    request({
                                        url: 'http://192.168.122.35:3000/deletemedia',
                                        method: 'POST',
                                        json: { 'media': media }
                                    }/* , function (err, resp, body1) {
                                        if (err) {
                                            return res.sendStatus(406)
                                        }
                                        else {
                                            if (body1.status == 'error') {
                                                console.log('media delete error')
                                                return res.sendStatus(407)
                                            } else {
                                                return res.sendStatus(200)
                                            }
                                        }
                                    } */);
                                    return res.sendStatus(200)
                                })
                            })
                        }
                    }
                })
            }
        }
    })
})

router.post('/:id/upvote', jsonParser, function (req, res) {
    var db = req.app.locals.db
    var user_db = req.app.locals.user_db

    if (req.cookies == undefined || req.cookies.session == undefined || req.cookies.session.current_user == undefined) {
        console.log("not login")
        res.status(404)
        return res.json({ 'status': 'error', 'error': 'you have to login to vote' })
    }
    if (req.body.upvote == null) {
        req.body.upvote = true
    }
    db.collection('questions').find({ 'id': req.params.id }).toArray(function (err, result) {
        if (result.length != 1) {
            console.log(req.params.id + " question not found")
            res.status(404)
            return res.json({ 'status': 'error', 'error': 'question not found' })
        }
        else {
            var upvoters = []
            var downvoters = []
            var hasUpVote = false
            var hasDownVote = false
            var changed = 0
            for (var i in result[0].upvoters) {
                if (result[0].upvoters[i] == req.cookies.session.current_user) {
                    hasUpVote = true
                } else {
                    upvoters.push(result[0].upvoters[i])
                }
            }
            for (var i in result[0].downvoters) {
                if (result[0].downvoters[i] == req.cookies.session.current_user) {
                    hasDownVote = true
                } else {
                    downvoters.push(result[0].downvoters[i])
                }
            }
            //console.log(req.body.upvote)
            if (req.body.upvote && hasUpVote && !hasDownVote) { // undo upvote
                changed--
                //console.log(req.params.id + " undo upvote")
            } else if (req.body.upvote && !hasUpVote && !hasDownVote) { // upvote
                changed++
                upvoters.push(req.cookies.session.current_user)
                //console.log(req.params.id + " upvote")
            } else if (!req.body.upvote && hasDownVote && !hasUpVote) { //undo downvote
                changed++
                //console.log(req.params.id + "undo downvote")
            } else if (!req.body.upvote && !hasDownVote && !hasUpVote) { //downvote
                changed--
                downvoters.push(req.cookies.session.current_user)
                //console.log(req.params.id + "downvote")
            } else if (req.body.upvote && hasDownVote && !hasUpVote) { //change downvote to upvote
                changed += 2
                upvoters.push(req.cookies.session.current_user)
                //console.log(req.params.id + "change downvote to upvote")
            } else if (!req.body.upvote && hasUpVote && !hasDownVote) { //change upvote to downvote
                changed -= 2
                downvoters.push(req.cookies.session.current_user)
                //console.log(req.params.id + "change upvote to downvote")
            }
            //console.log(result[0].score)
            db.collection('questions').updateOne({ 'id': req.params.id }, { $set: { 'upvoters': upvoters, 'downvoters': downvoters, 'score': result[0].score + changed } }, function (err, res) { //,{$inc:{'score':changed}}
                if (err) console.log(err);
                //console.log(req.params.id + " vote updated");
            });
            user_db.collection('users').updateOne({ 'username': result[0].user }, { $inc: { 'reputation': changed } }, function (err, res) {
                if (err) console.log(err);
                //console.log(username + " reputation updated " + changed)
            })
            res.json({ 'status': 'OK' })
        }
    })
})





module.exports = router;