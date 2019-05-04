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
    //console.log(req)
    if (req.cookies == undefined || req.cookies.session == undefined || req.cookies.session.current_user == undefined) {
        console.log(req.cookies.session)
        res.status(403)
        return res.json({ 'status': 'error', 'error': 'user not login' })
    } else {
        db.collection('users').find({ 'username': req.cookies.session.current_user }).toArray(function (err, result) {
            if (result.length != 1) {
                console.log("user not match found "+result.length)
                res.status(404)
                return res.json({ 'status': 'error', 'error': 'user not match' })
            } else {
                if (req.body.title == null || req.body.body == null || req.body.tags == null) {
                    console.log("body miss part")
                    res.status(404)
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
                db.collection("medias").find({ "poster": req.cookies.session.current_user, "used": false }).toArray(function (err, result) {
                    if (result == null && req.body.media.length != 0) {
                        res.status(404)
                        console.log("media has been used ")
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
                            }
                        }
                        if (!correct) {
                            res.status(404)
                            console.log("media id error")
                            return res.json({ 'status': 'error', 'error': 'media error' })
                        } else {
                            for (i in req.body.media) {
                                db.collection("medias").updateOne({ "id": req.body.media[i] }, { $set: { "used": true } })
                            }
                            db.collection('questions').insertOne(data)
                            console.log(data['id'] +" add success by "+ req.cookies.session.current_user)
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
            res.status(404)
            console.log("found result number is "+ result.length)
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
                console.log("use ip: " + req.headers['x-forwarded-for']+ " QID is "+ req.params.id)
                if (!views.includes(req.headers['x-forwarded-for'])) {
                    console.log("ip not included")
                    views.push(req.headers['x-forwarded-for'])
                    db.collection('questions').updateOne({ 'id': req.params.id }, { $set: { 'views': views } }, function (err, res) {
                        if (err) throw console.log(err);
                        //console.log("1 views updated");
                    });
                }
            }
            else {
                console.log(req.cookies.session.current_user+" get question "+req.params.id)
                //console.log(req.cookies.session.current_user + " getQuestion " + req.params.id)
                if (!views.includes(req.cookies.session.current_user)) {
                    console.log(req.cookies.session.current_user + " not included, views " + views)
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
            db.collection('users').find({ 'username': question.user }).toArray(function (err, result) {
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
    var db = req.app.locals.db
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
        db.collection("medias").find({ "poster": req.cookies.session.current_user, "used": false }).toArray(function (err, result) {
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
                    }
                }
                if (!correct) {
                    res.status(404)
                    console.log("media not match")
                    return res.json({ 'status': 'error', 'error': 'media error' })
                } else {
                    for (i in req.body.media) {
                        db.collection("medias").updateOne({ "id": req.body.media[i] }, { $set: { "used": true } })
                    }
                    db.collection('answers').insertOne(answer, function (err, res) {
                        if (err) console.log(err)
                    })
                    db.collection('questions').find({ 'id': req.params.id }).toArray(function (err, result) {
                        if (result.length != 1) {
                            res.status(404)
                            console.log("question not found")
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
                            for (i = 0; i < req.body.media; i++) {
                                db.collection("medias").updateOne({ "id": req.body.media[i] }, { "used": true })
                            }
                            console.log("answer add success by "+ req.cookies.session.current_user+" to "+req.params.id)
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
            console.log("get answers")
            return res.json({ 'status': 'OK', 'answers': result })
        }
    })
})


router.delete('/:id', jsonParser, function (req, res) {
    //need to delete the media
    media = []
    var db = req.app.locals.db
    if (req.cookies == undefined || req.cookies.session == undefined || req.cookies.session.current_user == undefined) {
        res.status(403)
        console.log("not login")
        return res.json({ 'status': 'error', 'error': 'not login' })

    }
    //console.log(req.cookies.session.current_user)
    db.collection('questions').find({ 'id': req.params.id }).toArray(function (err, result) {
        if (result.length != 1) {
            res.sendStatus(403)
            console.log("id not found")
            return res.json({ 'status': 'error', 'error': 'id wrong' })
        } else {
            var question = result[0]
            if (question.user != req.cookies.session.current_user) {
                console.log("poster wrong")
                return res.sendStatus(403)
            } else {
                for (i in result[0].media) {
                    media.push(result[0].media[i])
                }
                db.collection('questions').deleteOne({ 'id': req.params.id }, function (err, obj) {
                    if (err) {
                        console.log("delete failded")
                        res.sendStatus(403)                
                    }
                    db.collection('answers').find({ 'questionID': req.params.id }).toArray(function (err, r) {
                        if (r != null) {
                            if (r.length != 0) {
                                for (j in r) {
                                    console.log(r[j])
                                    for (i in r[j].media) {
                                        media.push(r[j].media[i])
                                    }
                                }
                                db.collection('answers').deleteMany({ 'questionID': req.params.id })
                            }
                        }
                        console.log(req.params.id+" deleted success")
                        request({  
                            url: 'http://192.168.122.35:3000/deletemedia',
                            method: 'POST',
                            json:{'media':media}
                        }, function(err,resp,body1){
                            if(err) {
                                return res.sendStatus(404)
                            }
                            else {
                                if(body1.status == 'error'){
                                    return res.sendStatus(404)
                                }else{
                                    return res.sendStatus(200)
                                }
                            }
                        });
                    })
                })
            }
        }
    })
})

router.post('/:id/upvote', jsonParser, function (req, res) {
    var db = req.app.locals.db

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
            console.log("question not found")
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
                console.log(req.params.id + " undo upvote")
            } else if (req.body.upvote && !hasUpVote && !hasDownVote) { // upvote
                changed++
                upvoters.push(req.cookies.session.current_user)
                console.log(req.params.id + " upvote")
            } else if (!req.body.upvote && hasDownVote && !hasUpVote) { //undo downvote
                changed++
                console.log(req.params.id + "undo downvote")
            } else if (!req.body.upvote && !hasDownVote && !hasUpVote) { //downvote
                changed--
                downvoters.push(req.cookies.session.current_user)
                console.log(req.params.id + "downvote")
            } else if (req.body.upvote && hasDownVote && !hasUpVote) { //change downvote to upvote
                changed += 2
                upvoters.push(req.cookies.session.current_user)
                console.log(req.params.id + "change downvote to upvote")
            } else if (!req.body.upvote && hasUpVote && !hasDownVote) { //change upvote to downvote
                changed -= 2
                downvoters.push(req.cookies.session.current_user)
                console.log(req.params.id + "change upvote to downvote")
            }
            var username = result[0].user
            console.log(result[0].score)
            db.collection('questions').updateOne({ 'id': req.params.id }, { $set: { 'upvoters': upvoters, 'downvoters': downvoters, 'score': result[0].score + changed } }, function (err, res) { //,{$inc:{'score':changed}}
                if (err) console.log(err);
                //console.log(req.params.id + " vote updated");
            });
            db.collection('users').updateOne({ 'username': username }, { $inc: { 'reputation': changed } }, function (err, res) {
                if (err) console.log(err);
                console.log(username + " reputation updated " + changed)
            })
            /* db.collection('users').updateOne({ 'username': username }, { $max: { 'reputation': 1 } }, function (err, res) {
                if (err) console.log(err);
                //console.log(username + " reputation <=1")
            }) */
            res.json({ 'status': 'OK' })
        }
    })
})





module.exports = router;