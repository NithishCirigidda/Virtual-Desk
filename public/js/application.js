function UM() {

    this.logout = function()  {
        $.ajax({ type: "DELETE"
                 , url: "/"
                 , success: function(response) {
                     rH();
                 }
               });
    };
}


function DM() {

    var crsticky = null
    , oldDoc = null
    , versionNum = 0
    , data = {
        currentPage : 0
        , logPages : []
        , docOptions : null
    };


    this.initializes = function() {
        if (document.location.href.indexOf("document") != -1) {
            $(domTargets.viewLogsButton).clickover({width: 500});
        }
    };
    


    this.reqReadAccess = function(id, name) {
        displayRequestAccess('read', id, name);
    };
    

    this.reqWriteAccess = function(id, name) {
        displayRequestAccess('write', id, name);    
    };    
    

    var displayRequestAccess = function(privs, id, name) {
        if (typeof privs == "undefined")  {
            return; 
        }

        var privsForDoc = [];
        $(domTargets.documentList).find("[id="+id+"] button")
            .filter(":disabled")
            .each(function(i, elem) {
                privsForDoc.push($(elem).text().toLowerCase());
            });
        

        $("#request-access").remove();
        

        var requestObj = {docId: id
                          , docName: name
                          , read: false
                          , write: false };
        
        privsForDoc.forEach(function(item, index){
            requestObj[item] = true;
        });
        
        if (typeof privs.push != "undefined") {
            privs.forEach(function(item, index) {
                requestObj[item] = true;    
            });
        } else if (typeof privs == "string") {
            requestObj[privs] = true;
        }
        // prepend the modal to the DOM and display
        $(domTargets.bodySecondContainer)
            .prepend(domTargets.requestAccessBlock(requestObj));
        
        $("#request-access").modal("show");
    };

    this.createDoc = function(docName) {
        $.ajax({type: "PUT"
                , data: {"docName": docName}
                , url: "/stickycreate"
                , success: function(response)
                   {
                     updateAlerts(response);
                     if (response.errors.length > 0)
                     {
                        return;
                     }
                rH();
                     var uDt = response.newDocument;
                    
                    $(domTargets.documentList)
                        .append(domTargets.singleDocEntry(uDt));
                    

                    sticky.closeCreateDocView();
                    

                    sticky.hideDeleteButtons();
                }
               });
    };
    
    this.openDocOnLoad = function(onloadDoc) {
         sharejs.open(onloadDoc.id, "text", function(error, doc) {
            if (oldDoc) {
                oldDoc.close();
            }
            crsticky = doc;

            
            var userDoc = onloadDoc
            , writeAccess = userDoc.writeAccess == "true";
            
             if (writeAccess) {
                 container.setReadOnly(false);
            } else {
                 container.setReadOnly(true);
            }
            
             updateLastSavedInfo(jQuery.timeago(new Date(userDoc.lastSaved)));
            
             if (doc.created) {
                doc.insert(0, userDoc.text);
            }
            
            doc.attach_ace(container);
            
            oldDoc = doc;       
        });      
    };
    

    this.deleteDoc = function(docId, docName) {
        bootbox.confirm("Are you sure you want to delete the document '" + docName + "' ?"
                        , function(yes) {
                            if (yes) {
                                $.ajax({type: "DELETE"
                                        , data: {"docId": docId}
                                        , url: "/stickydelete"
                                        , success: function(response)
                                        {
                                            // update alerts
                                            updateAlerts(response);
                                            
                                            $(domTargets.documentList)
                                                .find("li[id='"+docId+"']")
                                                .remove();
                                            
                                            sticky.hideDeleteButtons();
                                            rH();
                                        }

                                       });

                            }
                        });        
    };
    

    this.openShareDoc = function(id, name) {
        // remove any previously display share modals
        $("#share-modal").remove();
        
        // prepend modal to DOM and display
        $(domTargets.bodySecondContainer)
            .prepend(domTargets.shareDocumentBlock({docId:id, docName: name}));
        $("#share-modal").modal("show");
        
        // put typeahead feature
        $("#share-modal [name=userToShare]").typeahead()
            .on("keyup", getAutoCompleteData);
    };
    

    this.saveDoc = function(docId, docName) {
        // save the document
        $.ajax({type: "POST"
                , data: {"documentId" : docId}
                , url: "/storedoc"
                , success: function(response) {
                    // update alerts
                    updateAlerts(response);
                }
               });
    };
    
    /*
     * this.shareDoc
     * @param docId: id of document to share
     * @param docName: name of document to share
     * @param userToShare: username of the user to share document with
     * @param withReadAccess: grant userToShare read access
     * @param withWriteAccess: grant userToShare write access
     */
    this.shareDoc = function(docId, docName
                             ,userToShare 
                             , withReadAccess, withWriteAccess) {
        withReadAccess = (withReadAccess === "true");
        withWriteAccess = (withWriteAccess === "true");
        
        // send message to other user notifying him that you want to grant him
        // access to a document
        var options = {
            "docId":docId
            ,"docName":docName
            , "userToShare": userToShare
            , "withReadAccess":withReadAccess
            , "withWriteAccess":withWriteAccess
        };
        user_messages.sendMessage('shareAccess', options);
    };
    
    /*
     * this.requestDoc
     * @param docId: id of document to request access to
     * @param docName: name of document to request access to
     * @param withReadAccess: request read access
     * @param withWriteAccess: request write access
     */
    this.requestDoc = function(docId, docName
                               , withReadAccess, withWriteAccess) {
        
        withReadAccess = (withReadAccess === "true");
        withWriteAccess = (withWriteAccess === "true");
        
        // send message to all users that have share access to the document
        // that has documentId, docId
        // if no user has shareAccess to the document, notify user
        // that no user has shareAccess to that document
        var options = {
            "docId":docId
            ,"docName":docName
            , "withReadAccess":withReadAccess
            , "withWriteAccess":withWriteAccess
        };
        user_messages.sendMessage('requestAccess', options);
    };
    
    /*
     * showDeleteButtons -
     * show the delete buttons so that the user can 
     * delete the documents he doesn't want again
     */
    this.showDeleteButtons = function() {
        $(domTargets.documentList).find("button.close").show();
    };
    
    /*
     * hideDeleteButtons -
     * hide all x's in the documentList
     */
    this.hideDeleteButtons = function() {
        $(domTargets.documentList).find("button.close").hide();
    };
    
    /*
     * openCreateDocView -
     * Open create Document view
     */
    this.openCreateDocView = function() {
        $(domTargets.createDocBlock).show()
            .find('input').attr("value", "");
    };
    
    /*
     * closeCreateDocView -
     * Close create Document view
     */
    this.closeCreateDocView = function() {
        $(domTargets.createDocBlock).hide();
    };
}

function UserMessages() {    
    var data = {
        messageTypes: ['requestAccess', 'shareAccess']
    };
    
    /*
     * showMessages -
     * show the messages that the user currently has.
     * open a dialog and fill with messages
     */
    this.showMessages = function() {
        // fill dialog box with messages
        $.ajax({
                   type: "GET"
                   , url: "/showmessage"
                   , success: function(response) {
                       // update alerts
                       updateAlerts(response);
                       
                       if (response.messages.length == 0) {
                           return;
                       } else {
                           // add some more essential information
                           // to the template object
                           var messagesForTemplate = []
                           , agge;
                           response.messages
                               .forEach(function(item, index) {
                                   // set shareAccess, requestAccess flags
                                   // some sugar
                                   item.isRequestAccess = item.messageType == 0;
                                   item.isShareAccess = item.messageType == 1;
                                   // temporarily use agge here
                                  agge = item.access;
                                   item.readAccess = item.writeAccess = false;
                                   // de-couple privileges
                                   if (agge >= 4) {
                                       agge -= 4;
                                       item.readAccess = true;
                                   }
                                   if (agge >= 2) {
                                       agge -= 2;
                                       item.writeAccess = true;
                                   }
                                   messagesForTemplate.push(item);
                               });
                           
                           $("#messages-modal").remove();
                           $(domTargets.bodySecondContainer)
                               .prepend(domTargets.showMessagesBlock({"messages": messagesForTemplate}));
                           $("#messages-modal").modal("show");
                       }
                   }
        });
    };
    /*
     * sendMessage -
     * @param messageType -> type of message to send
     * @param options -> map of message meta-data and content
     *  options = {'docId':,'docName':,['userToShare':],'withReadAccess':,
     *             'withWriteAccess':,}
     * 
     */
    this.sendMessage = function(messageType, options) {
        // check if message type allowed
        if (data.messageTypes.indexOf(messageType) == -1) {
            return;
        }
        switch (messageType) {
        case 'requestAccess':
            $.ajax({
                type: "POST"
                , data: {"options":options}
                , url: "/stickyrequest"
                , success: function(response) {
                    // update alerts
                    updateAlerts(response);
                }
            });
            break;
        case 'shareAccess':
            $.ajax({
                type: "POST"
                , data: {"options":options}
                , url: "/stickyshare"
                , success: function(response) {
                    // update alerts
                    updateAlerts(response);
                }
            });
            break;
        default:
            console.log("***");
        }
    };
    /**
     * grantAccess ->
     * grant another user access to a document you have full access to.
     * @param fromUser - user requesting access to some document
     * @param documentId - document id of document
     * @param documentName - document name of document
     * @param access - access to be granted to fromUser
     */
    this.grantAccess = function(fromUser, documentId, documentName, access) {
        $.ajax({
            type: "POST"
            , url: "/getaccess"
            , data: {"userToGrant": fromUser
                     , "documentId":documentId
                     , "documentName":documentName
                     , "access":access}
            , success: function(response) {
                // update alerts
                updateAlerts(response);
                
                // delete the message
                deleteMessage(fromUser, documentId, access);
            }
        });
    };
    
    /**
     * acceptAccess ->
     * accept access to document
     * @param fromUser - user granting you access to some document
     * @param documentId - document id of document
     * @param documentName - document name of document
     * @param access - access to be granted to current user
     */
    this.acceptAccess = function(fromUser, documentId, documentName, access) {
        $.ajax({
            type: "POST"
            , url: "/putaccess"
            , data: {"acceptFromUser":fromUser,
                     "documentId":documentId, 
                     "documentName":documentName, 
                     "access":access}
            , success: function(response) {
                // update alerts
                updateAlerts(response);
                
                // delete message
                deleteMessage(fromUser, documentId, access);
                rH();
                if (response.reDisplay) {
                    $(domTargets.documentList).empty();
                    
                    // redisplay the entire list of documents
                    response.usersticky
                        .forEach(function(item, index) {
                            $(domTargets.documentList)
                                .append(domTargets.singleDocEntry(item));
                        });
                }
            }
        });
    };
    
    /**
     * declineAccess ->
     * decline request from another user.
     * In order words, just delete the message (mark as read).
     * @param fromUser -> user that sent request
     * @param documentId -> id of document concerned
     * @param access -> access
     */
    this.declineAccess = function(fromUser, documentId, access) {
        // for now, just delet ethe message
        deleteMessage(fromUser, documentId, access);
    };
    
    
    /**
     * deleteMessage -
     * delete the message from messages collection
     */
    var deleteMessage = function(fromUser, documentId, access) {
        $.ajax({
            type: "POST"
            , url: "/removemessage"
            , data: {"fromUser":fromUser
                     , "documentId":documentId
                     , "access":access}
            , success: function(response) {
                // update alerts
                updateAlerts(response);
            }
        });
    };
};

/*
 * Global Variables
 */
var domTargets = {
    documentList: "ul.list-of-documents"
    , createDocBlock: "div.documents-section div.create-doc-block"
    , singleDocEntry: Handlebars.compile($("#k").html())
    , currentDocLabel: "#header #docname"
    , errorsBlock: Handlebars.compile($("#et").html())
    , infosBlock: Handlebars.compile($("#it").html())
    , shareDocumentBlock: Handlebars.compile($("#share-document-modal").html())
    , showMessagesBlock: Handlebars.compile($("#mfu").html())
    , requestAccessBlock: Handlebars.compile($("#request-access-modal").html())
    , bodySecondContainer: "div.second-container"
    , lastSavedSpan: "#header #last-saved-time"
    , currentUserName: "#current-user-name"
    , viewLogsButton : ".pdf-render #view-logs"
    , popoverContent :  ".popover-content p .main-content"
};


// load instances of class into variables attached to the
// window
window["um"] = new UM();

window["sticky"] = new DM();
sticky.initializes();

window["user_messages"] = new UserMessages();



// ================ Helper functions =============
var rH = function() {
    document.location.href = '/';
};

/**
 * updateLastSavedInfo ->
 * updates the "last saved" display time 
 */
var updateLastSavedInfo = function(timeText) {
    $(domTargets.lastSavedSpan).html(timeText).closest("small").show();
};

/**
 * clearAjaxAlertBlocks ->
 * clears ajax alert infos and errors region to probably prepare for redisplay
 * of new errors or infos.
 *
 */
var clearAjaxAlertBlocks = function() {
    // clear out all alert blocks in DOM
    $("div.alert").remove();
};

/**
 * updateAjaxErrors ->
 * updates ajax errors region with new errors
 * @param errors : list of errors
 */
var updateAjaxErrors = function(errors) {
    $(domTargets.bodySecondContainer)
        .prepend(domTargets.errorsBlock({"errors":errors}));
};


/**
 * updateAjaxInfos ->
 * updates ajax infos region with new infos
 * @param infos: list of info messages
 */
var updateAjaxInfos = function(infos) {
    $(domTargets.bodySecondContainer)
        .prepend(domTargets.infosBlock({"infos":infos}));
};

/**
 * updateAlerts ->
 * @param response object gotten from an async. HTTP
 * request
 */
var updateAlerts = function(response) {
    // nothing to display
    if (!response.errors && !response.infos) {
        return;
    }
    
    if (response.errors.length > 0) {
        clearAjaxAlertBlocks();
        updateAjaxErrors(response.errors);
        return;
    } else if (response.infos.length > 0) {
        clearAjaxAlertBlocks();
        updateAjaxInfos(response.infos);
    }   
}

// ================ Handle bars helper functions ==========
// listalert handler
Handlebars.registerHelper('listalert', function(items, options) {
    var out = "<ul>";
    
    for (var i = 0, l=items.length; i<l;i++) {
        out = out + "<li>" + items[i] + "</li>";
    }
    
    return out + "</ul>";
});

// displaymessages handler
Handlebars.registerHelper('displaymessages', function(items, options) {
    var out = "<ul class='nav nav-list'>\n<li class='nav-header'>Messages</li>";
    
    for (var i = 0, l=items.length; i<l;i++) {
        out = out + '<li onclick="$(this).addClass(\'active\').siblings(\'li\').removeClass(\'active\');">' + options.fn(items[i]) + "</li>";
    }
    return out + "</ul>";
});

/**
 * getAutoCompleteData ->
 * get auto complete data from server.
 * @param ev : event
 */
var getAutoCompleteData = function(ev) {
    ev.stopPropagation();
    ev.preventDefault();
    
    //filter out up/down, tab, enter, and escape keys
    if( $.inArray(ev.keyCode,[40,38,9,13,27]) === -1 ){
        
        var self = $(this);
        
        //set typeahead source to empty
        self.data('typeahead').source = [];
        
        //active used so we aren't triggering duplicate keyup events
        if( !self.data('active') && self.val().length > 0){
            
            self.data('active', true);
            
            //Do data request. Insert your own API logic here.
            $.ajax({
                type: "GET"
                , url: "/complete"
                , data: {
                    word: $(this).val()
                    , purpose: $(this).attr('data-purpose')
                }
                , success: function(data) {
                    
                    //set this to true when your callback executes
                    self.data('active',true);
                    
                    //Filter out your own parameters. Populate them into an array, since this is what typeahead's source requires
                    var arr = [],
                        i=data.results.length;
                    while(i--){
                        arr[i] = data.results[i];
                    }
                    
                    //set your results into the typehead's source 
                    self.data('typeahead').source = arr;
                    
                    //trigger keyup on the typeahead to make it search
                    self.trigger('keyup');
                    
                    //All done, set to false to prepare for the next remote query.
                    self.data('active', false);
                }       
            });     
        }
    }
};
