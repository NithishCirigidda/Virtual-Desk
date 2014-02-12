var express = require('express')
    , app = module.exports = express.createServer()
    , sharejs = require('share').server
    , linking = require('./linking')
    , MongoStore = require('connect-mongo')(express)
    , settings = require('./settings');

app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser());
    app.use(express.session({
        secret: "sec",
        store: new MongoStore({
            db: "virtualdesk"
        })
    }));
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
}).dynamicHelpers({
        info: function(req, res) {
            return req.flash('info');
        },
        error: function(req, res) {
            return req.flash('error');
        }
    });

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

//share js configuration
var sharejs1 = {db: {type: 'none'}};

sharejs.attach(app, sharejs1);

//routing

app.post('/', linking.loop, linking.limits);
app.get('/', linking.loop, linking.limits);
app.del('/', linking.signout, linking.limits);
app.get('/s', linking.registration);
app.post('/s', linking.process);
app.get('/showmessage', linking.getMessages);
app.post('/getaccess', linking.giveAccess);
app.post('/putaccess', linking.takeAccess);
app.put('/stickycreate', linking.sticky);
app.del('/stickydelete', linking.remove);
app.post('/stickyshare', linking.perm);
app.post('/removemessage', linking.removeMessage);
app.get('/document/:documentId', linking.loop, linking.opensticky);
app.get('/complete', linking.Complete);
app.post('/storedoc', linking.savesticky);
app.post('/adddoctosession', linking.addsticky);
app.post('/reloadsession', linking.replaceses);
app.post('/stickyrequest', linking.getAccess);

app.listen((settings.port || process.env.PORT ), function(){
    console.log(" server listening on port "
        , app.address().port);
});
