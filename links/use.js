//sticky permission checking

var mongoose = require("mongoose");

var sticky = mongoose.model("sticky");


var cO = function(obj) {
    var clone = {};
    for (var i in obj) {
        if (typeof(obj[i])=="object") {
            clone[i] = cO(obj[i]);
        } else {
            clone[i] = obj[i];            
        }
    }
    return clone;
};


var lU = function(user) {
    var obj = {};
    
    obj.presentUser = user.userName;
    obj.issignIn = true;
    obj.usersticky = [];
    obj.userDocumentsPriv = user.dP;
    

    var uDt = {}
    , agge;
    
    user.dP.forEach(function(item, i) {
        uDt.id = item._id;
        uDt.name = item.name;
         uDt.readAccess = false;
        uDt.writeAccess = false;
        uDt.canShare = false;
        
         agge = item.access;
        
        if (agge >= 4) {
            uDt.readAccess = true;
            agge -= 4;
        }
        if (agge >= 2) {
            uDt.writeAccess = true;
            agge -= 2;
        }
        
         if (item.access == 6) {
            uDt.canShare = true;
        }
        
        obj.usersticky.push(uDt);
        uDt = {};
    });
    
    return obj;
};


var dES = function(res, errors) {
    res.render("registrationejs",
               {title: "Sign Up for Virtual Desk"
                , shortTitle: "Sign Up"

                , Style: "stylesheet.css"
                , Script: "application.js"
                , errors: errors
                , port : require("../settings").port
               });
};


var sDS = function(documentId, session) {
    if (session.usersticky != undefined) {
        for (var i = 0; i < session.usersticky.length; i++) {
            if (String(session.usersticky[i].id) == String(documentId)) {
                return session.usersticky[i];
            }
        }
    }
    return null;
};


var cND = function(docName, presentUser) {
     var nD = new sticky();
    var nDO = {name: docName
                     , data: ""
                     , lastModified: new Date()
                     , usersWithShareAccess: [presentUser]
                     , documentType: 0
                    };
    
    for (var key in nDO) {
        nD[key] = nDO[key];
    }
     nD.save();
    
    return nD;
};


var gUS = function(fromUser, documentId) {
    sticky.findOne({_id: documentId}, function(err, doc) {
        if (!err) {
            if (doc.usersWithShareAccess.indexOf(fromUser) == -1) {
                doc.usersWithShareAccess.push(fromUser);
                
                 doc.save();
            }
        } else {
            console.log("****");
        }
    });
};


exports.cO = cO;
exports.lU = lU;
exports.dES = dES;
exports.sDS = sDS;
exports.cND = cND;
exports.gUS = gUS;
