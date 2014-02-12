//login verification

var settings = require("../settings");

exports.limits = function(req, res, err){
    req.session.presentUser = (req.session.presentUser == undefined ?  "" :
                               req.session.presentUser);
    
    req.session.issignIn = (req.session.issignIn == undefined ? false :
                              req.session.issignIn);
    
    req.session.usersticky = (req.session.usersticky == undefined ? [] :
                                 req.session.usersticky);
    
    if (req.session.presentUser && req.session.issignIn) {

        res.render("sticky",
                   {title: "Virtual Desk:"
                    , shortTitle: "Virtual Desk"
                    , Script: "application.js"
                    , presentUser: req.session.presentUser
                    , issignIn: req.session.issignIn
                    , usersticky: req.session.usersticky
                    , port : settings.port
                   });
        
    } else {

        res.render("home",
                   {title: "Log Into/Sign Into to Virtual Desk!"
                    , shortTitle: "Virtual Desk"
                    , Style: "stylesheet.css"
                    , port : settings.port});
    }
};
