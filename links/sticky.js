exports.sticky = function(req, res) {
    var response = {infos:[], errors: []};
    
    if (!(req.session.presentUser && req.session.issignIn)) {
       
        return;
    } else if (req.session.presentUser === req.body.document.forUser) {

        var document = req.body.document;
        
        req.session.usersticky.push(document);
        

    }    
};
