
var mongoose = require("mongoose")
, Schema = mongoose.Schema
    , settings = require("./settings")
    , temp = require("temp")
, ObjectId = Schema.ObjectId
    , fs = require("fs-extra")
    , path = require("path")
    , exec = require("child_process").exec
, io = require("socket.io").listen(app)


, util = require("util")
    , app = require("./app")
, http = require("http");

io.set('log level', 1);


mongoose.connect(settings.db.url);


require("./schema");
var User = mongoose.model("User")
, sticky = mongoose.model("sticky")
, stickyright = mongoose.model("stickyright")
, Message = mongoose.model("Message");


var use = require("./links/use.js");

exports.limits = require("./links/limits.js").limits;
exports.signout = require("./links/signout.js").signout;
exports.registration = require("./links/registration.js")
                               .registration;
exports.addsticky = require("./links/sticky.js")
                               .sticky;





var MESSAGE_TYPES = {
    'requestAccess': 0
    , 'shareAccess': 1
};


var openDocuments = {};





exports.giveAccess = function(req, res) {
    var response = {errors: [], infos:[]};
    

    if (!(req.session.presentUser && req.session.issignIn)) {
        response.errors.push("You cannot grant access since you are not logged in.");
        res.json(response);
        return;
    }
    
    User.findOne({"_id" : req.body.userToGrant}, function(err, user) {
        if (err || !user) {
            response.errors.push("No user '" + req.body.userToGrant 
                                 + "' exists or an error occured "
                                 + "while looking for this user");
            res.json(response);
        } else {

            if (req.body.access < 4) {
                response.errors.push("You should grant a user at least 'Read' privilge");
                res.json(response);
                return;
            }
            

            var userHasDoc = false;
            
            user.dP
                .forEach(function(item, index) {
                    if (item._id.equals(req.body.documentId)) {
                        userHasDoc = true;
                    }
                });
            
            var agge = req.body.access
                         , readAccess = false
            , writeAccess = false
            , canShare = false;
            

            if (agge == 6) {
                canShare = true;
                             

                use.gUS(req.body.userToGrant
                                           , req.body.documentId);
            }
            

            if (agge >= 4) {
                readAccess = true;
                agge -= 4;
            }
            if (agge >= 2) {
                writeAccess = true;
                agge -= 2;
            }
            

            var newUserDocument = {
                "id": req.body.documentId
                , "name": req.body.documentName
                , "readAccess" : readAccess
                , "writeAccess" : writeAccess
                , "canShare" : canShare
                , "forUser" : req.body.userToGrant
            };                         
            
            if (userHasDoc) {
                var upgrading = false;
                
                for (var i = 0; i < user.dP.length; i++) {
                    if (user.dP[i]._id.equals(newUserDocument.id)
                        && user.dP[i].access < req.body.access) {
                        upgrading = true;
                        

                        response.reloadDocs = true;
                        
                        user.dP[i].access = parseInt(req.body.access);
                        
                        user.save(function(err) {
                            if (err) {
                                console.log(" ***");
                            }
                        });
                        

                        response.infos.push("You just upgraded the privileges of '"
                                            + req.body.userToGrant + "' for the sticky '"
                                            + req.body.documentName + "'");
                        

                        io.sockets.volatile.emit("changedDocument"
                                                 , JSON.stringify(newUserDocument));
                        res.json(response);
                        
                        break;      
                    }
                }
                if (!upgrading) {

                    response.infos.push("'" + req.body.userToGrant
                                        + "' already has higher or equal access"
                                        + " to the sticky '"
                                        + req.body.documentName + "'");
                    res.json(response);
                }
            } else {

                response.reloadDocs = true;
                
                var newDocPriv = new stickyright();
                newDocPriv.access = parseInt(req.body.access);
                newDocPriv.name = req.body.documentName;
                newDocPriv._id = req.body.documentId; 
                
                for (i = 0; i < user.dP.length; i++) {
                    if (user.dP[i]._id.equals(newDocPriv._id)) {
                        user.dP.splice(i, 1);
                        break;
                    }
                }

                user.dP.push(newDocPriv);
                user.save();                              
                
                response.infos.push("You just granted '"+req.body.userToGrant+"' "+
                                    (readAccess ? "Read" +
                                     ((!writeAccess) 
                                      ? " ": ", ") :"")+
                                    (writeAccess ? "Write" : " ") +
                                    " Access to '" 
                                    + req.body.documentName + "'");
                
                io.sockets.volatile.emit("changedDocument"
                                         , JSON.stringify(newUserDocument));
                

                res.json(response);
            }   
        }
    });
};


exports.takeAccess = function(req, res) {
    var response = {errors:[], infos:[]
                    , newDocument:null
                    , reDisplay:false
                    , usersticky: req.session.usersticky};
    

    if (!(req.session.presentUser && req.session.issignIn)) {
        response.errors.push("You cannot accept the invitation since you aren't logged in");
        res.json(response);
        return;
    }
    

    if (parseInt(req.body.access) < 4) {
        response.errors.push("You should accept at least 'Read' privilege");
        res.json(response);
    }
    
    User.findOne({"_id":req.session.presentUser}, function(err, user) {
         var userHasDoc = false;
        req.session.usersticky
            .forEach(function(item, index) {
                if (String(item.id) == String(req.body.documentId)) {
                    userHasDoc = true;
                }
            });
        
        var agge = req.body.access
        , readAccess = false
        , writeAccess = false
        , canShare = false;
        
        if (agge == 6) {
            canShare = true;
            
             use.gUS(req.session.presentUser
                                       , req.body.documentId);
        }
        

        if (agge >= 4) {
            readAccess = true;
            agge -= 4;
        }
        if (agge >= 2) {
            writeAccess = true;
            agge -= 2;
        }
        

        var newUserDocument = {
            "id": req.body.documentId
            , "name": req.body.documentName
            , "readAccess" : readAccess
            , "writeAccess" : writeAccess
            , "canShare" : canShare
        };
        
        if (userHasDoc) {
             var upgrading = false;
            
            for (var i = 0; i < user.dP.length; i++) {
                if (String(user.dP[i]._id) == String(newUserDocument.id)
                    && user.dP[i].access < req.body.access) {
                    upgrading = true;
                    
                     response.reDisplay = true;
                    
                    user.dP[i].access = parseInt(req.body.access);
                    user.save();
                    
                     response.infos.push("You just upgraded your rights to the sticky '"
                                        + newUserDocument.name + "'");
                    break;
                }
            }
            if (upgrading) {
                for (i = 0; i < req.session.usersticky.length; i++) {
                    if (String(req.session.usersticky[i].id) == String(newUserDocument.id)) {
                         req.session.usersticky[i] = newUserDocument;
                    }
                }
                res.json(response);
                return;
            }
             response.infos.push("You already have higher or equal access to the sticky '"
                                + newUserDocument.name + "'");
            res.json(response);     
        } else {        
             response.reDisplay = true;
            
             var newDocPriv = new stickyright();
            newDocPriv.access = parseInt(req.body.access);
            newDocPriv.name = req.body.documentName;
            newDocPriv._id = req.body.documentId;
            
            for (var i = 0; i < user.dP.length; i++) {
                if (user.dP[i]._id.equals(newDocPriv._id)) {
                    user.dP.splice(i, 1);
                    break;
                }
            }
            
             user.dP.push(newDocPriv);
            user.save(); // save user
            
             req.session.usersticky.push(newUserDocument);
            
             response.newDocument = newUserDocument;
            
             response.infos.push("You just accepted "+
                                (readAccess ? "Read" +
                                 ((!writeAccess) 
                                  ? " ": ", ") :"")+
                                (writeAccess ? "Write" : " ") + 
                                " Access to '" + req.body.documentName +
                                "' from user '" + req.body.acceptFromUser
                                + "'");
            res.json(response);
        }
    });
};

exports.process = function(req, res) {
    var errors = {};
    var isError = false;
    var nUser = req.body.newUser;

    if (nUser.userName.length == 0) {
        errors["userNameToken"] = "Enter a username";
    }

    if (!(nUser.password.length > 4
        && /\d+/.test(nUser.password))) {
        errors["passwordInvalid"] = "Password must be at least 5 chars "
            + "and must contain at least one digit";
        isError = true;
    }

    if (nUser.password != nUser.confirmPassword) {
        errors["passwordNoMatch"] = "Passwords don't match";
        isError = true;
    }


    if (!(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/
        .test(nUser.email))) {
        errors["emailInvalid"] = "Enter a valid email address";
        isError = true;
    }

    if (!(nUser.firstName.length > 0
        && nUser.lastName.length > 0)) {
        errors["namesInvalid"] = "Enter a first Name and a Last Name";
        isError = true;
    }



    if (!isError) {

        User.find({_id : nUser.userName}, function(err, users) {
            if (users.length > 0) {
                errors["userNameTaken"] = "The username '" +
                    nUser.userName + "' is already taken";
                isError = true;

                use.dES(res, errors);
            } else {

                var newstickyUser = new User();
                for (var key in nUser) {
                    newstickyUser[key] = nUser[key];
                }
                newstickyUser.dP = [];
                newstickyUser.save(function(err) {
                    if (err) {
                        console.log("***");


                    }

                });

                var loadedUser = use.lU(newstickyUser);
                for (key in loadedUser) {
                    req.session[key] = loadedUser[key];
                }


                res.redirect("home");
            }
        });

    } else {

        use.dES(res, errors);
    }
};

exports.sticky = function(req, res) {

    var response = {infos:[]
        , errors: []
        , code:200
        , newDocument: {id:null
            , name:null
            , readAccess: true
            , writeAccess: true
            , canShare: true}
    };

    var docName = req.body.docName;

    if (!(docName.length && docName.length > 0)) {
        response.errors.push("Error in creating sticky with no title or name");
        res.json(response);
        return;
    } else if (!(req.session.issignIn && req.session.presentUser)) {
        response.errors.push("You're not not logged in. Please log in!");
        res.json(response);
        return;
    }


    var found = false;
    for (var i = 0; i < req.session.usersticky.length; i++) {
        if (req.session.usersticky[i].name == docName) {
            found = true;
            break;
        }
    }
    if (found) {
        response.errors.push("Error in creating sticky that shares"
            + " its name with an already existing sticky you have.");
        res.json(response);
        return;
    }
    else {

        var nD = use.cND(req.body.docName
            , req.session.presentUser);


        var docPriv = new stickyright();
        docPriv._id = nD._id;
        docPriv.name = nD.name;


        var newUserDocument = {};

        User.findOne({"_id": req.session.presentUser}, function(err, user) {
            if (err || !user) {
                response.errors.push("Couldn't find you. Weird.");
                res.json(response);
                return;
            }


            user.dP.push(docPriv);


            user.save();


            newUserDocument.id = docPriv._id;
            newUserDocument.name = docPriv.name;


            newUserDocument.readAccess = true;
            newUserDocument.writeAccess = true;
            newUserDocument.canShare = true;

            req.session.usersticky.push(newUserDocument);
            response.newDocument = newUserDocument;


            response.infos.push("Just created the new sticky '"
                + req.body.docName + "'. Hooray!");
            res.json(response);
        });
    }

};

exports.remove = function(req, res) {

    var response = {errors:[], infos:[], code:200};


    var docId = req.body.docId
        , docName;

    if (!(req.session.presentUser && req.session.issignIn)) {
        response.errors.push("Weird. Seems like you're not logged in.");
        res.json(response);
        return;
    }


    User.findOne({_id: req.session.presentUser}, function(err, user) {
        if (err || !user) {
            response.errors.push("Had problems processing your deletion. Try again.");
            res.json(response);
            return;
        }
        for (var i = 0; i < user.dP.length; i++) {
            if (user.dP[i]._id.equals(docId)) {
                docName = user.dP[i].name;
                user.dP.splice(i, 1);

                break;
            }
        }


        user.save();


        for (i = 0; i < req.session.usersticky.length; i++) {
            if (String(req.session.usersticky[i].id) == String(docId)) {
                req.session.usersticky.splice(i,1);
            }
        }

        var removeDocs = function(err, docs) {
            if (docs.length == 0) {

                sticky.findOne({_id:docId}).remove(function(err) {
                    if (err) {
                        console.log(" ***");
                    }
                    res.json(response);
                });
            } else {


                sticky.findOne({_id: docId}, function(err, doc) {
                    if (!err) {
                        var found = false
                            , i;

                        for (i = 0; i < doc.usersWithShareAccess.length; i++) {
                            if (doc.usersWithShareAccess[i]
                                == req.session.presentUser) {
                                found = true;
                                break;
                            }
                        }
                        if (found) {
                            doc.usersWithShareAccess.splice(i, 1);


                            doc.save();

                            if (response.errors.length == 0 && docName.length > 0) {
                                response.infos.push("Successfully deleted the sticky '"
                                    + docName + "'");
                                res.json(response);
                            }
                        }
                    }
                });
            }
        };


        User.find({"dP._id":docId}, removeDocs);
    });
};

exports.perm = function(req, res) {
    var response = {errors:[], infos:[], code: 200};


    var options = req.body.options;

    var agge = ((options.withReadAccess == "true" ? 4 : 0) +
        (options.withWriteAccess == "true" ? 2 : 0));

    if (!(req.session.presentUser && req.session.issignIn)) {
        response.errors.push("You are not logged in. So you can't share access");
    }
    if (agge == 0) {
        response.errors.push("You can't try to share no privilege Dude/Dudette");
    }
    if (!(options.docId
        && options.docName
        && options.userToShare)) {
        response.errors.push("Options passed in are incomplete");
    }
    if (agge < 4) {
        response.errors.push("You should share at least 'Read' privilege");
    }

    User.findOne({_id: options.userToShare}, function(err, user) {
        if (err) {
            console.log(" ***");
        }
        if (!user) {
            response.errors.push("The user you want to send a message to doesn't exist");
        }
        if (response.errors.length > 0) {

            res.json(response);
        } else {

            var newMessage = new Message();
            newMessage.messageType = MESSAGE_TYPES.shareAccess;
            newMessage.fromUser = req.session.presentUser;
            newMessage.toUser = options.userToShare;
            newMessage.documentId = options.docId;
            newMessage.documentName = options.docName;
            newMessage.access = agge;


            newMessage.save();

            var withReadAccess = (options.withReadAccess == 'true')
                , withWriteAccess = (options.withWriteAccess == 'true');


            response.infos.push("You just invited '"+options.userToShare+"' to have "+
                (withReadAccess ? "Read" +
                    ((!withWriteAccess)
                        ? " ": ", ") :"") +
                (withWriteAccess ? "Write" : " ")+
                " Access to '" + options.docName + "'");


            io.sockets.volatile.emit("newMessage", JSON.stringify(newMessage));


            res.json(response);
        }
    });
};

exports.replaceses = function(req, res) {
    var response = {infos: [], errors: [], usersticky: null};

    if (!(req.session.presentUser && req.session.issignIn)) {
        response.errors.push("You are not logged in.");
        res.json(response);
        return;
    } else if (req.session.presentUser == req.body.document.forUser) {
        User.findOne({_id : req.session.presentUser}, function(err, user) {

            var loadedUser = use.lU(user);
            for (var key in loadedUser) {
                req.session[key] = loadedUser[key];
            }


            response.usersticky = req.session.usersticky;
            res.json(response);
        });
    }
};

exports.removeMessage = function(req, res) {
    var response = {infos:[], errors:[]};

    if (!(req.session.presentUser && req.session.issignIn)) {
        response.errors.push("Ya not logged in");
        res.json(response);
    } else {
        Message.findOne({fromUser: req.body.fromUser
            , documentId: req.body.documentId
            , access: parseInt(req.body.access)
            , toUser: req.session.presentUser})
            .remove(function(err) {
                if (err) {
                    console.log("**");
                }
                res.json(response);
            });
    }
};

exports.opensticky = function(req, res) {

    var documentId = req.params.documentId;


    sticky.findOne({_id:documentId}, function(err, doc) {
        if (err || !doc) {
            req.flash("error", "An Error Occured while trying to open the sticky");
            res.redirect('back');
            return;
        }


        var lastModified
            , userDoc
            , docInSession
            , writeable
            , sharesWith;

        docInSession = use.sDS(documentId, req.session);
        if (docInSession == null) {
            return;
        }

        sharesWith = (openDocuments[documentId] ?
            openDocuments[documentId] : []);

        if (openDocuments[documentId]
            && openDocuments[documentId].indexOf(req.session.presentUser) == -1) {
            openDocuments[documentId].push(req.session.presentUser);
        }

        if (!openDocuments[documentId]) {
            openDocuments[documentId] = [req.session.presentUser];
        }


        userDoc = {
            "id" : documentId
            , "name" : doc.name
            , "text" : escape(doc.data) // escape special characters
            , "lastSaved" : doc.lastModified
            , "sharesWith" : sharesWith
            , "readAccess" : docInSession.readAccess
            , "writeAccess" : docInSession.writeAccess
            , "canShare" : docInSession.canShare
        };

        res.render("stickyopen"
            , { title: "Viewing the sticky notes '"+ doc.name + "'"
                , shortTitle: "Virtual desk"
                , tagLine: "'" + doc.name + "'"
                , Style: "stylesheet.css"
                , Script: "opensticky.js"
                , uDt: userDoc
                , presentUser: req.session.presentUser
                , issignIn: req.session.issignIn
                , port : settings.port
                , usersticky: req.session.usersticky
            });
    });
};

exports.savesticky = function(req, res) {
    var response = {code: 400, errors: [], infos: []}
        , documentId = req.body.documentId
        , documentText;

    app.model.getSnapshot(documentId, function(shapshotErr, shapshotDoc) {
        if (shapshotErr || !shapshotDoc) {
            response.errors.push("Error in finding sticky to save");
            res.json(response);
            return;
        }
        documentText = shapshotDoc.snapshot;

        sticky.findOne({_id:documentId}, function(err, doc){
            var newLine
                , mb = 1024 * 1024;

            if (err || !doc) {
                response.errors.push("Error in finding sticky to save");
                res.json(response);
                return;
            }

            if (documentText.length > 15 * mb) {
                response.errors.push("This sticky is 15MB or above. Too large to store.");
                res.json(response);
                return;
            }

            doc.data = new Buffer(documentText);
            doc.lastModified = new Date();

            doc.save(function(err) {
                if (err) {
                    console.log(" **");
                }
            });

            var savedDocMessage = {
                "sharesWith" : openDocuments[documentId]
                , "lastModified" : doc.lastModified
            };

            io.sockets.volatile.emit("savedDocument", JSON.stringify(savedDocMessage));

            // after save
            response.code = 200;
            response.infos.push("Successfully saved the sticky  note");
            res.json(response);
        });
    });
};
exports.loop = function(req, res, next) {

    if ((req.body.username == undefined
        && req.body.password == undefined) ||
        (req.body.username.length == 0
            && req.body.password.length == 0)) {


        next();
    } else if (req.session.presentUser && req.session.issignIn) {


        next();
    } else if (req.body.username && req.body.username.length > 0
        && req.body.password && req.body.password.length > 0) {


        User.findOne({"_id": req.body.username}, function(err, user) {
            if (err) {
                req.session.presentUser = null;
                req.session.issignIn = false;
                next();
                return;
            }

            if (!user || typeof user.authenticate != "function") {
                req.flash("error", "There's no user called '"
                    + req.body.username + "' in our database");
                res.redirect('back');
                return;
            } else if (!user.authenticate(req.body.password)) {
                req.flash('error', "Password does not match Username entered");
                res.redirect('back');
                return;
            } else {
                var loadedUser = use.lU(user);
                for (var key in loadedUser) {
                    req.session[key] = loadedUser[key];
                }

                next();
            }
        });
    } else {

        if (!(req.body.username && req.body.password)) {
            req.flash('error', "Enter both a username and password");
            res.redirect('back');
            return;
        }
    }
};


exports.Complete = function(req, res) {
    var purpose = req.query.purpose
        , word = req.query.word;

    switch (purpose) {
        case "usernames":

            var typed = req.query.word
                , data = {code:200, results:[]};


            User.find({_id: new RegExp(typed)}, function(err, users) {
                if (!err) {
                    users.forEach(
                        function(item, index) {
                            if (item.userName != req.session.presentUser) {
                                data.results.push(item.userName);
                            }
                        });
                }
                res.json(data);
            });
            break;
        default:
            console.log("***");
    };
};


exports.getAccess = function(req, res) {
    var response = {errors:[], infos:[], code: 200};


    var options = req.body.options;

    var agge = ((options.withReadAccess == "true" ? 4 : 0) +
        (options.withWriteAccess == "true" ? 2 : 0));


    if (!(req.session.presentUser && req.session.issignIn)) {
        response.errors.push("You are not logged in. So you can't share access");
    }
    if (agge == 0) {
        response.errors.push("You can't try to request for no privilege");
    }
    if (!(options.docId
        && options.docName)) {
        response.errors.push("Options passed in are incomplete");
    }

    if (agge < 4) {
        response.errors.push("You should request for at least read access to a sticky ");
    }

    if (response.errors.length > 0) {
        res.json(response);
        return;
    }

    sticky.findOne({_id: options.docId}, function(err, doc) {
        if (err) {
            console.log("***");
        } else {
            if (doc.usersWithShareAccess.length > 0) {
                var newMessage, i;

                for (i = 0; i < doc.usersWithShareAccess.length; i++) {
                    newMessage = new Message();
                    newMessage.messageType = MESSAGE_TYPES.requestAccess;
                    newMessage.fromUser = req.session.presentUser;
                    newMessage.toUser = doc.usersWithShareAccess[i];
                    newMessage.documentId = options.docId;
                    newMessage.documentName = options.docName;
                    newMessage.access = agge;


                    newMessage.save();


                    io.sockets.volatile.emit("newMessage", JSON.stringify(newMessage));

                }
                response.infos.push("Sent a 'Request More Privileges' message"
                    + " to all the users who have share access"
                    + " to the sticky '" + options.docName + "'");

                res.json(response);
            } else {
                response.errors.push("No user currently has Share Access "
                    + "to that sticky");


                res.json(response);
            }
        }
    });
};


exports.getMessages = function(req, res) {
    var response = {errors:[], infos:[], messages:[]};


    Message.find({toUser : req.session.presentUser}, function(err, messages) {
        if (err) {
            response.errors.push("Error while retrieving messages. Try again later.");
            res.json(response);
        } else if (messages.length == 0) {
            response.infos.push("You have no messages!");
            res.json(response);
        } else {

            messages.forEach(function(item, index) {
                var agge = item.access;

                item.readAccess = false;
                item.writeAccess = false;

                if (agge >= 4) {
                    item.readAccess = true;
                    agge -= 4;
                }
                if (agge >= 2) {
                    item.writeAccess = true;
                    agge -= 2;
                }
                response.messages.push(item);
            });


            res.json(response);
        }
    });
};
