
var crypto = require("crypto")
, mongoose = require("mongoose")
, Schema = mongoose.Schema
, ObjectId = Schema.ObjectId

, settings = require("./settings")

, fs = require("fs-extra");

var stickyright = new Schema ({
    access: { type: Number
             , default: 6 }

    , _id: ObjectId
    , name: String
});

var sticky = new Schema ({
    name: String
    , data: Buffer
    , lastModified: Date
    , createdAt: { type: Date
                  , default: new Date() }


    , documentType: Number 
    , usersWithShareAccess: [String]
    
});

var User = new Schema ({

    _id: { type: String }
    , hashedPassword: { type: String
                       , index: {unique: true }
                      }
    , salt: String
    , firstName: String
    , lastName: String
    , email: { type: String }


    , memberSince: {type: Date
                    , default: new Date()
                   }
    , dP: [stickyright]
});

var Message = new Schema ({
    messageType: Number

    , fromUser: String
    , toUser: String
    , documentId: ObjectId
    , documentName: String
    , access: Number
    , timeSent: { type: Date
                 , default: new Date()
                }
});



User.virtual("id").get(function() {
    return this._id.toHexString();
});

User.virtual("password").set(function(password) {
    this._password = password;
    this.salt = this.makeSalt();
    this.hashedPassword = this.encryptPassword(password);
}).get(function() {
    return this._password;
});

User.method("authenticate", function(plainText) {
    return this.encryptPassword(plainText) == this.hashedPassword;
});

User.method("makeSalt", function() {
    return Math.round((new Date().valueOf() * Math.random())) + '';
});

User.method("encryptPassword", function(password) {
    return crypto.createHmac("sha1", this.salt)
        .update(password).digest("hex");
});


User.pre("save", function(next) {
    if (!(this.firstName && this.lastName
          && this.email && this.userName)) {
        next(new Error("Invalid Params"));
    } else {
        next();
    }
});

User.virtual("userName").get(function() {
    return this["_id"];
});

User.virtual("userName").set(function(userName) {
    this["_id"] = userName;
});


mongoose.model("User", User);
mongoose.model("sticky", sticky);
mongoose.model("stickyright", stickyright);
mongoose.model("Message", Message);
