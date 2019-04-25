var express = require('express');
var bodyParser = require('body-parser');
var uniqid = require("uniqid");
var router = express.Router();
var jsonParser = bodyParser.json()
var path = require('path');


router.get('/', function (req, res) {
    res.sendFile(path.resolve('../questions/questions.html'));
});
router.post('/add', jsonParser, function (req, res) {
    var db = req.app.locals.db
    //console.log(req)
    if (req.body.current_user == null) {
        return res.json({ 'status': 'error', 'error': 'user not login' })
    } else {
        db.collection('users').find({ 'username': req.body.current_user }).toArray(function (err, result) {
            if (result.length != 1) {
                return res.json({ 'status': 'error', 'error': 'user not match' })
            } else {
                if (req.body.title == null || req.body.body == null || req.body.tags == null) {
                    return res.json({ 'status': 'error', 'error': 'wrong request type' })
                }
                if (req.body.media == null) {
                    req.body.media = []
                }
                var data = {}
                data['id'] = uniqid();
                data['user'] = req.body.current_user
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
                db.collection("medias").find({ "poster": req.body.current_user, "used": false }).toArray(function (err, result) {
                    if (result == null && req.body.media.length != 0) {
                        return res.json({ 'status': 'error', 'error': 'media error' })
                    } else {
                        m = []
                        for(i in result){
                            m.push(result[i].id)
                        }
                        correct = true
                        for (i in req.body.media) {
                            if (!m.includes(req.body.media[i])) {
                                correct = false
                            }
                        }
                        if (!correct) {
                            return res.json({ 'status': 'error', 'error': 'media error' })
                        } else {
                            for (i in req.body.media){
                                db.collection("medias").updateOne({"id":req.body.media[i]},{$set:{"used":true}})
                            }
                            db.collection('questions').insertOne(data)
                            res.json({ 'status': "OK", 'id': data.id })
                        }
                    }
                })
            }
        })
    }
});

router.get('/:id', jsonParser, function (req, res) {
    var db = req.app.locals.db
    db.collection('questions').find({ 'id': req.params.id }).toArray(function (err, result) {
        if (result.length != 1) {
            return res.json({ 'status': 'error', 'error': 'question not found' })
        }
        else {
            var question = result[0]
            if (req.body.current_user == null) { //count by IP
                req.body.current_user = req.connection.remoteAddress
            }
            var views = []
            //console.log(question.views)
            for (var i in question.views) {
                views.push(question.views[i])
            }
            var answers = []
            for (var i in question.answers) {
                answers.push(question.answers[i])
            }
            if (!views.includes(req.body.current_user)) {
                //console.log("not included, views " + views)
                views.push(req.body.current_user)
                db.collection('questions').updateOne({ 'id': req.params.id }, { $set: { 'views': views } }, function (err, res) {
                    if (err) throw console.log(err);
                    //console.log("1 views updated");
                });
            }

            question['view_count'] = views.length
            delete question.views
            delete question._id
            delete question.answers
            question['answer_count'] = answers.length
            db.collection('users').find({ 'username': question.user }).toArray(function (err, result) {
                if (err) console.log(err)
                question.user = { 'username': result[0].username, 'reputation': result[0].reputation }
                res.json({ 'status': 'OK', 'question': question })
            })
        }
    })

})


router.post('/:id/answers/add', jsonParser, function (req, res) {
    var db = req.app.locals.db
    if (req.body.current_user == null) {
        return res.json({ 'status': 'error', 'error': 'you have to login to answer' })
    } else {
        var answer = req.body
        const id = uniqid("A")
        if (req.body.media == null) {
            req.body.media = []
        }
        answer['id'] = id
        answer['score'] = 0
        answer['user'] = req.body.current_user
        answer['is_accepted'] = false
        answer['timestamp'] = Date.now() / 1000
        answer['media'] = req.body.media
        answer['voters'] = {}
        answer['questionID'] = req.params.id
        db.collection("medias").find({ "poster": req.body.current_user, "used": false }).toArray(function (err, result) {
            if (result == null && req.body.media.length != 0) {
                return res.json({ 'status': 'error', 'error': 'media error' })
            } else {
                m = []
                for(i in result){
                    m.push(result[i].id)
                }
                correct = true
                for (i in req.body.media) {
                    if (!m.includes(req.body.media[i])) {
                        correct = false
                    }
                }
                if (!correct) {
                    return res.json({ 'status': 'error', 'error': 'media error' })
                } else {
                    for (i in req.body.media){
                        db.collection("medias").updateOne({"id":req.body.media[i]},{$set:{"used":true}})
                    }
                    db.collection('answers').insertOne(answer, function (err, res) {
                        if (err) console.log(err)
                    })
                    db.collection('questions').find({ 'id': req.params.id }).toArray(function (err, result) {
                        if (result.length != 1) {
                            return res.json({ 'status': 'error', 'error': 'question not found' })
                        }
                        else {
                            var question = result[0]
                            var answers = []
                            for (var i in question.answers) {
                                answers.push(question.answers[i])
                            }
                            answers.push(id)
                            db.collection('questions').updateOne({ 'id': req.params.id }, { $set: { 'answers': answers } }, function (err, res) {
                                if (err) throw err;
                                //console.log("question:"+req.params.id+"add one answer");
                            });
                            for (i = 0; i < req.body.media; i++){
                                db.collection("medias").updateOne({"id":req.body.media[i]},{"used":true})
                            }
                            res.json({ 'status': 'OK', 'id': id })
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
            return res.json({ 'status': 'OK', 'answers': result })
        }
    })


})
router.delete('/:id', jsonParser, function (req, res) {
    //need to delete the media
    media = []
    var db = req.app.locals.db
    if (req.body.current_user == null) {
        res.status(403)
        return res.json({ 'status': 'error','error':'not login' })

    }
    //console.log(req.body.current_user)
    db.collection('questions').find({ 'id': req.params.id }).toArray(function (err, result) {
        if (result.length != 1) {
            res.status(403)
            return res.json({ 'status': 'error','error':'id wrong' })
        } else {
            var question = result[0]
            if (question.user != req.body.current_user) {
                res.status(403)
                return res.json({ 'status': 'error','error':'not poster' })
            } else {
                for (i in result[0].media) {
                    media.push(result[0].media[i])
                }
                db.collection('questions').deleteOne({ 'id': req.params.id }, function (err, obj) {
                    if (err) {
                        res.status(403)
                        return res.json({ 'status': 'error','error':'delete failed' })
                    }
                    db.collection('answers').find({ 'questionID': req.params.id }, function (err, r) {
                        if(r!= null){
                        if(r.length != 0){
                            for(j in r){
                                for (i in r[j].media) {
                                    media.push(r[j].media[i])
                                }
                            }
                            db.collection('answers').deleteMany({ 'questionID': req.params.id })
                        }}
                    })
                    res.json({ 'status': 'OK', 'media': media })
                })
            }
        }
    })
})

router.post('/:id/upvote', jsonParser, function (req, res) {
    var db = req.app.locals.db

    if (req.body.current_user == null) {
        return res.json({ 'status': 'error', 'error': 'you have to login to vote' })
    }
    if (req.body.upvote == null) {
        req.body.upvote = true
    }
    db.collection('questions').find({ 'id': req.params.id }).toArray(function (err, result) {
        if (result.length != 1) {
            return res.json({ 'status': 'error', 'error': 'question not found' })
        }
        else {
            var upvoters = []
            var downvoters = []
            var hasUpVote = false
            var hasDownVote = false
            var changed = 0
            for (var i in result[0].upvoters) {
                if (result[0].upvoters[i] == req.body.current_user) {
                    hasUpVote = true
                } else {
                    upvoters.push(result[0].upvoters[i])
                }
            }
            for (var i in result[0].downvoters) {
                if (result[0].downvoters[i] == req.body.current_user) {
                    hasDownVote = true
                } else {
                    downvoters.push(result[0].downvoters[i])
                }
            }
            //console.log(req.body.upvote)
            if (req.body.upvote && hasUpVote && !hasDownVote) { // undo upvote
                changed--
                //console.log("1")
            } else if (req.body.upvote && !hasUpVote && !hasDownVote) { // upvote
                changed++
                upvoters.push(req.body.current_user)
                //console.log("2")
            } else if (!req.body.upvote && hasDownVote && !hasUpVote) { //undo downvote
                changed++
                //console.log("3")
            } else if (!req.body.upvote && !hasDownVote && !hasUpVote) { //downvote
                changed--
                downvoters.push(req.body.current_user)
                //console.log("4")
            } else if (req.body.upvote && hasDownVote && !hasUpVote) { //change downvote to upvote
                changed += 2
                upvoters.push(req.body.current_user)
                //console.log("5")
            } else if (!req.body.upvote && hasUpVote && !hasDownVote) { //change upvote to downvote
                changed -= 2
                downvoters.push(req.body.current_user)
                //console.log("6")
            }
            var username = result[0].user
            db.collection('questions').updateOne({ 'id': req.params.id }, { $set: { 'upvoters': upvoters, 'downvoters': downvoters, 'score': result[0].score + changed } }, function (err, res) { //,{$inc:{'score':changed}}
                if (err) console.log(err);
                //console.log(req.params.id + " vote updated");
            });
            db.collection('users').updateOne({ 'username': username }, { $inc: { 'reputation': changed } }, function (err, res) {
                if (err) console.log(err);
                //console.log(username + " reputation updated")
            })
            db.collection('users').updateOne({ 'username': username }, { $max: { 'reputation': 1 } }, function (err, res) {
                if (err) console.log(err);
                //console.log(username + " reputation <=1")
            })
            res.json({ 'status': 'OK' })
        }
    })
})





module.exports = router;