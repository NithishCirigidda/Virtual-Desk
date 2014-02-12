//user signout
exports.signout = function(req, res, next) {
    if (req.session.presentUser && req.session.issignIn) {
        req.session.regenerate(function(err) {
            if (err) {
                console.log("****");
            } 
            next();
        });
    }
};
