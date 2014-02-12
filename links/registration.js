//user registration
exports.registration = function(req, res) {
    res.render("registrationejs",
               {title: "Sign Up for Virtual Desk"
                , shortTitle: "Sign Up"
                , Style: "stylesheet.css"
                , Script: "application.js"
                , port : require("../settings").port
               });
};
