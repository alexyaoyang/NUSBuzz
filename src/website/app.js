/*
 * Module dependencies
 */
// hm
var express          = require('express'),
    stylus           = require('stylus'),
    nib              = require('nib'),
    ObjectID         = require('mongodb').ObjectID,
    mongo            = require('mongoskin'),
    //flash            = require('connect-flash'),
    util             = require('util'),
    fs               = require('fs'),
    https            = require('https'),
    url              = require('url'),
    request          = require('superagent'),
    Sequence         = require('futures').sequence,
    sequence         = Sequence(),
    MongoStore       = require('connect-mongo'),
    mongoStore       = MongoStore(express),
    moment           = require('moment'),
    Promise          = require('future'),
    Join             = require('join');


/****** Define constants here ******************/

var LAPI = {
    'API_KEY'      : '',
    //'CALLBACK_URL' : 'https://localhost:443/login_callback',
    'CALLBACK_URL' : '',
    'LAPI_URL'     : "",
    'LAPI_ALL'     : function() {
                        return this.LAPI_URL + "?apikey=" + this.API_KEY + 
                        "&url=" + this.CALLBACK_URL;
                    }
                    
}

var API_VERSION = '/api/1.0';             // string to use in routes


/** Create the SSL server ************************************/
var app     = express(),

    options = {
                    key : fs.readFileSync('./ssl/key.pem'),
                    cert : fs.readFileSync('./ssl/cert.pem'),
                    requestCert : true
              },

    server  = https.createServer(options, app);


server.listen(443);
console.log('Express server started on port %s', 
            server.address().port);


/******* Connect to Mongo DB ****************/
var db = mongo.db('localhost:27017/test',
                    { safe : 'true' });


/************* Define Express stuff ************/
function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib());
}
/** Declare middleware **/
app.configure(function() {
    app.set('views', __dirname + '/views')
    app.set('view engine', 'jade')
    app.use(stylus.middleware(
      { src: __dirname + '/public'
      , compile: compile
      }
    ));
    app.use(express.logger('dev'));
    app.use(express.cookieParser());
    app.use(express.bodyParser());
    app.use(express.session({
        store  : new mongoStore( {db : 'online-sessions' } ),
        secret : 'm10yx21y0',
        cookie : {
                    'path'   : '/',
                    httpOnly : true,
                    maxAge   : null
                 }
    }));
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'))

});


/** Pages to serve start here ********************/
app.get('/', function (req, res) {
  res.render('index',
      { 
          title : 'Home' ,
          user : req.user
      }
  )
})
app.get('/profile', function(req, res, next) {
    res.render('profile',
        { 
            title : 'Profile',
            user : req.user
        }
    )

});


/** For login **/
app.get('/login', function (req, res) {
    res.redirect (LAPI.LAPI_ALL());
});
app.get('/login_callback', function(req, res) {
    // needed due to token not being in the body lol.
    var url_parts = url.parse(req.url, true);
    var query = url_parts.query;

    /** Server-side objects, so 
     * tampering with cookies will not work!!
     * Muahahaha.
     */
    req.session.authenticated = true;
    req.session.user = {};


    /** To simplify asynchronous callbacks **/
    sequence 
        .then (function(next) {
            request 
                .get('https://ivle.nus.edu.sg/api/Lapi.svc/UserName_Get')
                .set('Accept', 'application/json')
                .query({ 
                    'APIKey' : LAPI.API_KEY,
                    'Token' : query.token
                })
                .end(function(res) {
                    req.session.user.name = res.body;
                    console.log(req.session.user.name);
                    next();
                });
        })

        .then (function(next) {
            request 
                .get('https://ivle.nus.edu.sg/api/Lapi.svc/UserID_Get')
                .set('Accept', 'application/json')
                .query({ 
                    'APIKey' : LAPI.API_KEY,
                    'Token' : query.token
                })
                .end(function(res) {
                    req.session.user.nusID = res.body;
                    console.log(req.session.user.nusID);
                    next();
                });
        })

        .then (function(next) {
            request 
                .get('https://ivle.nus.edu.sg/api/Lapi.svc/UserEmail_Get')
                .set('Accept', 'application/json')
                .query({ 
                    'APIKey' : LAPI.API_KEY,
                    'Token' : query.token
                })
                .end(function(res) {
                    req.session.user.email = res.body;
                    console.log(req.session.user.email);
                    next();
                });
        })
        
        .then (function(next) {
            db
                .collection('users')
                .findOne({ "nusID" : req.session.user.nusID }, 
                        function(err, item) {
                            if (!err) {
                                if (!item) {
                                    db 
                                        .collection('users')
                                        .insert(req.session.user, function(err) {
                                            next();
                                        
                                        });
                                
                                } else {
                                    next();
                                
                                }
                            }
                        }); 

        })
        
        .then (function(next) {
            res.redirect('/#home');
            next();
        
        });

});


app.get('/dashboard', ensureAuthenticated, function(req, res) {
    res.send('hello, user: ' + req.session.user.name + '.  You are at the dashboard');

});


/** Send the user data back when queried with GET **/





app.get('/logout', function(req, res) {
    req.session.destroy();
    res.redirect('/');
});


//app.get('/auth-failure', function(req, res) {

//});


// for ALEX Yao: testing purposes 
app.get('/testDashboardDetails', ensureAuthenticated, function(req, res) {
  res.render('testDetails',
      { 
          title : 'This is testing dashboard details for Alex' ,
          user : req.user
      });

});



/*******************************************************************/
/** Route for API.  place everything else here *********************/
/*******************************************************************/

/** Helper functions for API **/
// This checks if a specified document exists in the DB.  It returns a promise,
// which is is then fulfilled in the future.  To track it, use a promise.when()
// event listener.
var docExists = function(collectionName, id) {

    var promise = Promise();

    db 
        .collection(collectionName)
        .findOne({ "_id" : id }, 
            function(err, item) {
                if (err || !item) {
                    promise.fulfill(undefined, false)

                } else {
                    promise.fulfill(undefined, true)
                }
            
            });

    return promise;
    
}

app.get( API_VERSION, function(req, res, next) {
    res.jsonp(200, { version : API_VERSION });
    return next();

});

/** Setting and getting user details **/
app.get( API_VERSION + '/user/details', ensureAuthenticated, function(req, res, next) {
    db.collection('users')
        .findOne( 
            { nusID : req.session.user.nusID }, 
            function(err, item) {
                if (!err) {
                    item.dateJoin = moment(item._id.getTimestamp()).format('L');
                    res.jsonp(200, item);
                }
            });

});
app.post( API_VERSION + '/user/details/update', ensureAuthenticated, function(req, res, next) {
    var newStuff = req.body;
    db
        .collection('users')
        .update(
            { nusID : req.session.user.nusID }, 
            { 
                '$set' : {
                    handphone : newStuff.handphone,
                    alerts : newStuff.alerts
                }
            },

            {
                upsert : true,
                multi : true,
                strict : true,
            
            },
            function(err, item) {
                if (!req.query || !req.query.callback) {
                    res.jsonp(200, { status : "successful" });
                
                } else {
                    res.redirect(req.query.callback);
                
                }
            
            });

});

/** Route for all resources **/
/*app.all( API_VERSION + '/resource/*', ensureAuthenticated, function(req, res, next) {
    next();

});
*/

var uploadResource = function(curFile, callback) {
    var buffer;
    var id = new ObjectID();

    sequence 
        .then(function(next) {
            buffer = fs.readFileSync(curFile.path);
            next();
        
        })


        .then(function(next) {
            db
                .gridfs()
                .open(
                    id,
                    curFile.name,
                    'w', 
                    {
                        // Root specifies collection to save in 
                        root         : 'dataCollection',
                        content_type : curFile.type,
                    
                    },

                    function(err, gs) {
                        if (err) {
                            console.log(err);

                        }
                        next(gs);
            
                });
        
        })


        .then(function(next, gs) {
            console.log(buffer);
            console.log(gs);
            gs.write(buffer, function(err, reply) {
                if (err) {
                    console.log(err);
                
                }

                next(gs);
            
            });
        })


        .then(function(next, gs) {
            gs.close(function(err, reply) {
                if (err) {
                    console.log(err);
                
                }
                next();
            
            });
        })


        .then(function(next) {
            callback(id.toString());
            next();

        });

}
app.post( API_VERSION + '/resource/upload', ensureAuthenticated, function(req, res) {
    var curFile = req.files.file;
    uploadResource(curFile, function(id) {
        res.jsonp(200, { _id : id });
    
    });

});
app.get( API_VERSION + '/resource', ensureAuthenticated, function(req, res) {

    /**
     * 2 async sequences are used.  The first checks if the file exists.  If it
     * is nonexistent, it returns a 404 response.  Else, it returns the file.
     */
    sequence 

        .then(function(next) {
            db
                .collection('dataCollection.files')
                .findOne({ "_id" : ObjectID(req.query.q) }, 
                    function(err, item) {
                        if (err || !item) {
                            err = "GOT ERROR: CANNOT FIND";
                            console.error(err);
                            res
                                .status(404)
                                .send("NOT FOUND")
                        }
                        
                        next(err);
                });
        })

        .then(function(next, err) {
            if (!err) {

                sequence 

                    .then(function(next) {
                        db
                            .gridfs()
                            .open(
                                ObjectID(req.query.q),
                                null,
                                'r', 
                                {
                                    // Root specifies collection to save in 
                                    root : 'dataCollection',
                                
                                },
                                function(err, gs) {
                                    if (err) {
                                        console.log(err);

                                    }
                                    next(gs);
                        
                            });
                    })


                    .then(function(next, gs) {
                        gs.read(function(err, reply) {
                            if (err) {
                                console.log(err);
                            }

                            res.write(reply);
                            res.end();
                            next(gs);
                        
                        });
                    
                    })
                

                    .then(function(next, gs) {
                        gs.close(function(err, reply) {
                            if (err) {
                                console.log(err);
                            
                            }
                            next();
                        
                        });
                    })

            }

            next();
        
        });

});
app.get( API_VERSION + '/resource/delete', ensureAuthenticated, function(req, res) {

    /**
     * 2 async sequences are used.  The first checks if the file exists.  If it
     * is nonexistent, it returns a 404 response.  Else, it deletes the file.
     */
    sequence 

        .then(function(next) {
            console.log(req.query.q);
            db
                .collection('dataCollection.files')
                .findOne({ "_id" : ObjectID(req.query.q) }, 
                    function(err, item) {
                        if (err || !item) {
                            err = "GOT ERROR: CANNOT FIND";
                            console.error(err);
                            res
                                .status(404)
                                .send("NOT FOUND")
                        }
                        
                        next(err);
                });
        })

        .then(function(next, err) {
            if (!err) {

                sequence
                .then(function(next) {
                    db
                        .gridfs()
                        .open(
                            ObjectID(req.query.q),
                            null,
                            'w', 

                            { root : 'dataCollection' },

                            function(err, gs) {
                                if (err) {
                                    console.log(err);

                                }

                                next(gs);
                    
                        });
                
                })


                .then(function(next, gs) {
                    gs.unlink(function(err, reply) {
                        next();
                    
                    });
                })


                .then(function(next) {
                    res.send(200, { status : 'success' });
                    next();
                
                });

            }

            next();
        
        });

});

app.get('/uploadForm', function(req, res) {
  res.render('uploadTestJoel',
              { 
                  title : 'Upload' ,
                  //user : req.user
              }
  )

});

/** Route for all item-related tasks **/
app.get( API_VERSION + '/buzz/item', ensureAuthenticated, function(req, res, next) {
    // This uses a sequence to help sequence the async events.  It also uses a
    // promise (such that values from async functions can be returned and used)

    var mySeq = new Sequence();

    mySeq
        .then(function(next) {
            console.log("GETTING ITEM BY ID: " + req.param('id'));
            var promise = docExists('items', new ObjectID(req.param('id')));

            /* proceed when the promise if fulfilled */
            promise.when(function(err, data) {
                if (!data) {
                    // does not exist
                    // hand error flag to future sequences
                    err = 1;
                    res.jsonp(404, {
                        status : 'failed', 
                        details : 'nonexistent item' 
                    });
                
                }
                next(err);
            
            });
        
        }) 

        .then(function(next, err) {
            if (!err) {
                db
                    .collection('items')
                    .findById(new ObjectID(req.param('id')), 
                        function(err, item) {
                            if (err) {
                                res.jsonp(404, {
                                    status : 'failed',
                                    details : 'DB error'
                                });
                            
                            } else {
                                res.jsonp(200, item);
                            
                            }
                        });
                
            }

            next();
        });
});
app.post( API_VERSION + '/buzz/item/pushbid', ensureAuthenticated, function(req, res, next) {
    if (!req.param('id') || 
        !req.param('nusID') || 
        !req.param('bid')) {

        res.jsonp(403, {
            status : 'failed',
            detail : 'incomplete fields'
        });

        return;
    }


    docExists('items', ObjectID(req.param('id')) ).when(function(err, item) {
        console.log('PUSH BID ITEM EXISTENCE LOG: ' + item)
        if (!item) {
            res.jsonp(403, {
                status : 'failed',
                detail : 'nonexistent ID'
            });
            return;
        }


        new Sequence()
        .then(function(next) {
            db 
            .collection('items')
            .findById(ObjectID(req.param('id')), function(err, item) {
                next(err, item);
            
            });
        })
        

        .then(function(next, err, item) {
            if (!item.allBids) {
                item.allBids = [];
            
            }

            item.allBids.push({
                nusID : req.param('nusID'),
                bid : req.param('bid'),
                time : moment().unix()

            });

            next(item);
        
        })


        .then(function(next, item) {
            db
            .collection('items')
            .save(

                item,

                {
                    upsert : true,
                    multi  : true,
                    strict : true
                },

                function(err, item) {
                    next(err, item);

                }
            );

        })


        .then(function(next, err, item) {
            if (err) {
                res.jsonp(403, {
                    status : 'failed', 
                    detail : 'Failed to write to DB' 
                });

            } else {
                if (!req.query || !req.query.callback) {
                    res.jsonp(200, { 
                        status : 'successful',
                        _id : req.param('id')
                    });
                
                } else {
                    res.redirect(req.query.callback);
                
                }
            }

            next();
        
        });
        
    });

});
app.post( API_VERSION + '/buzz/item/create', ensureAuthenticated, function(req, res, next) {
    // format the JSON document nicely first
    var newItem = req.body;


    if (!newItem.category || 
        !newItem.tags ||
        !newItem.detail || 
        !newItem.name) {

        // implies error
        console.log('GOT AN ERROR');
        res.jsonp(403, {status : "failed", detail: "incomplete"} );
        next();     // next here refers to express app.js next NOT async
        return;
        
    }

    if (!newItem.minBid) {
        newItem.minBid = 0.00;
    
    }

    newItem.allBids = [];
    newItem.nusID = req.session.user.nusID;
    newItem._id = ObjectID();                   // create Object ID object
    newItem.fileUrls = [];
    
    // chunk the tags into nice array
    var tmpArray = newItem.tags.split(',');

    tmpArray
    .forEach(function(item, i) {
        tmpArray[i] = tmpArray[i].trim();

    });

    delete newItem.tags;
    newItem.tags = tmpArray;


    var sequenceHere = Sequence();

    // uses sequence 
    // part I: synchronize all parallel file uploads and notify when done 
    // part II : upload details to DB

    sequenceHere
        .then(function(next) {
            // for aysnchronous join LOL.
            var join = Join.create();

            var callbackArr = [];

            // create callbacks for files
            if (req.files !== 'undefined') {
                var fileKeys = Object.keys(req.files);
                console.log("IMAGE ARRAY FOR DEBUGGING: " + fileKeys);

                fileKeys.forEach(function(key, i) {
                    var a = function() { 
                        return i;
                    }();                        // IFHE to save current itr of i


                    callbackArr.push(join.add());
                    console.log("Callback array DEBUG: " + callbackArr);
                    // TODO: FIX THE POST BUG HERE.  PERHAPS COPY CODE FROM RESOURCE UPLOAD INSTEAD?

                    uploadResource(req.files[key], function(id) {
                        // push the newly created URL onto stack
                        newItem.fileUrls.push(id);
                        // call the join async callback when done
                        callbackArr[a]();
                    
                    });


                    join.when(function() {
                        // proceed to saving the object in 
                        // DB when everything is returned.  Whee!!
                        next();
                    
                    });
                
                });
            
            } else {
                next();

            }
        
        })


        .then(function(next) {
            db
                .collection('items')
                .save(

                    newItem,
                    {
                        upsert : true,
                        multi  : true,
                        strict : true
                    },

                    function(err, item) {
                        if (err) {
                            res.jsonp(403, {
                                status : 'failed', 
                                detail : 'Failed to write to DB' 
                            });

                            next();
                        }


                        if (!req.query || !req.query.callback) {
                            res.jsonp(200, { 
                                status : 'successful',
                                _id : newItem._id
                            });
                        
                        } else {
                            //NOTE: FIXED BUG 1
                            // else redirect
                            res.redirect(req.query.callback);
                        
                        }

                        next();

                    });
                
                })

});
app.post( API_VERSION + '/buzz/item/update', ensureAuthenticated, function(req, res, next) {
    var sequence2 = Sequence();
    var newItem = req.body;

    sequence2
        .then(function(next) {
            var promise = docExists('items', ObjectID(newItem._id));

            /* proceed when the promise if fulfilled */
            promise.when(function(err, data) {
                if (!data) {
                    // does not exist
                    // hand error flag to future sequences
                    err = 1;
                    res.jsonp(404, {
                        status : 'failed', 
                        details : 'nonexistent item' 
                    });
                
                }
                next(err);
            
            });
        
        }) 

        .then(function(next, err) {
            if (!err) {
                // clone object shortcut
                var newItem2 = JSON.parse(JSON.stringify(newItem));
                // Remove items that can be generated
                delete newItem2._id;
                delete newItem2.dateStart;

                db
                    .collection('items')
                    .updateById(ObjectID(newItem._id),
                        newItem2,
                        {
                            upsert : true,
                            multi : true,
                            strict : true
                        },
                        function(err, item) {
                            if (err) {
                                res.jsonp(403, {
                                    status : "failed", 
                                    details : "Updating field problem"
                                });
                            
                            } else {
                                res.jsonp(200, {
                                    status : "successful"
                                
                                });
                            }
                        
                        });
            }

            next();
        });


});
app.get( API_VERSION + '/buzz/item/delete', ensureAuthenticated, function(req, res, next) {
    var sequence2 = Sequence();

    sequence2
        .then(function(next) {
            var promise = docExists('items', ObjectID(req.param('id')));

            /* proceed when the promise if fulfilled */
            promise.when(function(err, data) {
                if (!data) {
                    // does not exist
                    // hand error flag to future sequences
                    err = 1;
                    res.jsonp(404, {
                        status : 'failed', 
                        details : 'nonexistent item' 
                    });

                    next(err);
                
                } else {
                    // unlink the images here first 

                    db
                        .collection('items')
                        .findById(ObjectID(req.param('id')), 

                            function(err, item) {
                                join = Join.create();
                                var callbacksArr = [];

                                for (var i = 0; i < item.fileUrls
                                                        .length; i++) {

                                    var a = function() { 
                                        return i;
                                    }();                // IFHE

                                    // add new callback
                                    callbacksArr.push(join.add());

                                    request 
                                        .get(API_VERSION + '/resource/delete')
                                        .query(item.fileUrls[a])
                                        .end(function() {
                                            console.log('deleted item');
                                            // invoke callback 
                                            callbackArr[a]();
                                
                                    });

                                    // all deleted
                                    join.when(function() {
                                        // proceed to next sequence
                                        // when done
                                        next(err);

                                    });
                                }
                            
                            }); 
                
                }

                next(err);
            
            });
        
        }) 
        
        .then (function(next, err) {
            if (!err) {
                db
                    .collection('items')
                    .removeById(_id, 
                        null,
                        function(err, item) {
                            console.log("removed item");
                            if (err) {
                                res.jsonp(403, {
                                    status : 'failed',
                                    details : 'error with DB deletion'
                                });

                            } else {
                                res.jsonp(200, {
                                    status : 'successful'
                                });
                            }
                        });
            
            }

            next();
        
        });


});
app.get( API_VERSION + '/buzz/item/find', ensureAuthenticated, function(req, res, next) {
    var q = req.query;
    var verbose = true;

    if (!q.v || q.v === 'false') {
        verbose = false;

    }


    var p = {};
    for (property in q) {
        p[property] = new RegExp('(.*)' + q[property] + '(.*)', 'i');
        
    }

    delete p.v;


    new Sequence()

    .then(function(next) {
        db 
        .collection('items')
        .findItems(p , function(err, items) {
            console.log(items);
            next(items);

        });
    
    })


    .then(function(next, items) {
        for (var i = 0; i < items.length; i++) {

            if (verbose) {
                // NOTE: THIS PRINTS OUT THE LITERAL MONGO ID STRING
                items[i]._id = items[i]._id.toString();
            
            } else {
                items[i] = items[i]._id.toString();
            
            }
        
        }

        next(items);

    })


    .then(function(next, items) {
        res.jsonp(200, {
            'items' : items

        });

        next();
    
    });


});

/** Routes for all transaction-related tasks **/
var itemExist = function(item) {
    var promise = Promise();
    db 
    .collection('transactions')
    .findOne({ "id" : item }, 
        function(err, item) {
            if (err || !item) {
                promise.fulfill(undefined, false)

            } else {
                promise.fulfill(undefined, true)
            }
        
        });

    return promise;

};
app.get( API_VERSION + '/buzz/transactions', ensureAuthenticated, function(req, res, next) {

    var id = ObjectID(req.param('id'));

    docExists('items', id)
    .when(function(err, data) {
        if (err || !data) {
            res.jsonp(404, {
                status : 'failed',
                details : 'Yikes!  Nonexistent transaction'

            });

            return;
        }


        new Sequence()
        .then(function(next) {
            db 
            .collection('transactions')
            .findById(id, function(err, item) {
                res.jsonp(200, item);
                next();
            
            });
        
        });
    
    });


});
app.post( API_VERSION + '/buzz/transactions/create', ensureAuthenticated, function(req, res, next) {

    var transaction = req.body;
    
    if (!transaction.itemID || 
        !transaction.description ||
        !transaction.buyer ||
        !transaction.seller
        ) {

        res.jsonp(403, {
            status : 'failed',
            detail : 'Boohoo - incomplete fields!'

        });
        
    }

    // check for existence of transaction, based on itemID
    itemExist(transaction.itemID).when(function(err, item) {
        if (item) {
            res.jsonp(403, {
                status : 'failed',
                detail : 'Yikes - item has been assigned a transaction!'

            });

            return;

        }


        new Sequence()
        .then(function(next) {

            transaction._id = new ObjectID();
            transaction.dateSet = moment().unix();

            db 
            .collection('transactions')
            .save(

                transaction,
                {
                    upsert : true,
                    multi  : true,
                    strict : true
                },

                function(err, item) {
                    if (err) {
                        res.jsonp(403, {
                            status : 'failed',
                            detail : 'Oops!  Error with saving to DB.'

                        });

                    } else {
                        res.jsonp(200, {
                            _id : transaction._id.toString()

                        });

                    }

                    next();

                });
        
        });
        
    
    });
    


});
app.get( API_VERSION + '/buzz/transactions/delete', ensureAuthenticated, function(req, res, next) {

    var id = ObjectID(req.param('id'));

    docExists( 'transactions', id )
    .when(function(err, item) {
        if (err || !item) {
            res.jsonp(403, {
                status : 'failed',
                detail : 'Yikes - No such item!'

            });

            return;

        }

        db 
        .collection('transactions')
        .removeById(id, null, function(err, item) {
            if (err) {
                res.jsonp(403, {
                    status : 'failed',
                    detail : 'DB Error - failed to delete item'

                });

                return;
            }

            res.jsonp(200, {
                status : 'success'
            
            });
        
        });
    });
    
});
app.get( API_VERSION + '/buzz/transactions/find', ensureAuthenticated, function(req, res, next) {
    var q = req.query;

    console.log('QUERY: ' + JSON.stringify(q));

    if ( (q.id && !(q.id instanceof Array)) ||
       (q.category && !(q.category instanceof Array)) || 
       (q.tags && !(q.tags instanceof Array)) ||
       (q.buyer && !(q.buyer instanceof Array)) ||
       (q.seller && !(q.seller instanceof Array))) {


       console.log(q.category && !(q.category instanceof Array));
       console.log(q.tags && !(q.tags instanceof Array));
       console.log(q.buyer && !(q.buyer instanceof Array));
       console.log(q.seller && !(q.seller instanceof Array));

        res.jsonp(404, {
            status : 'failed',
            details : 'Yikes!  You gave an invalid array.'

        });

        return;

   }

    // default sort order is ascending
    var sortOrder = 1;

    if (q.sort && q.sort === 'desc') {
        sortOrder = -1;
    }
       

    var regexes = {
        ids        : /(.*)/i ,
        buyers     : /(.*)/i ,
        sellers    : /(.*)/i ,
        categories : /(.*)/i

    };

    if (q.id) {
        console.log('ID: ' + q.id);
        regexes.ids = new RegExp( '/' + q.id.join('|')  + '/i' );
    
    }

    if (q.buyer) {
        regexes.buyers = new RegExp( '/' + q.buyer.join('|') + '/i' );
    
    }

    if (q.seller) {
        regexes.sellers = new RegExp( '/' + q.seller.join('|') + '/i' );
    
    }

    if (q.category) {
        regexes.categories = new RegExp( '/' + q.category.join('|') + '/i' );
    
    }


    new Sequence()
    .then(function(next) {

        var query = {
            _id     : regexes.ids,
            buyer  : regexes.buyers,
            seller : regexes.sellers
        
        };

        if (q.dateSet) {
            query.dateSet = { '$gte' : q.dateSet[0], '$lte' : q.dateSet[1] }
        
        }

        if (q.dateMet) {
            query.dateMet = { '$gte' : q.dateMet[0], '$lte' : q.dateMet[1] }
        
        }

        db 
        .collection('transactions')
        .findItems(
        query,
        {
            sort : [[ 'itemID', 1 ]]
        },
        function(err, items) {
            next(err, items);
        
        });
    
    })


    .then(function(next, err, transactions) {
        var arr = [];
        for (var i = 0; i < transactions.length; i++) {
            arr.push(transactions[i].itemID);
            
        }

        var itemStr = '/' + transactions.join('|') + '/i';

        next(arr, itemStr);
    
    })


    .then(function(next, transactions, itemIDs) {

        console.log('DEBUG');
        console.log(q.tags);
        console.log(itemIDs);
        console.log(regexes.categories);

        var query = {};

        if (q.tags) {
            query.tags = { $all : q.tags };
        
        }

        db 
        .collection('items')
        .findItems({
            _id : itemIDs,
            category : regexes.categories

        }, 

        {
            sort : [[ '_id', 1 ]]
        },
        
        function(err, item) {
            next(transactions, item);
        
        });
    
    })


    .then(function(next, transactions, items) {
        var results = [];

        console.log("ITEMS: " + items);

        //  TODO: O(n^2): This is costly
        for (var i = 0; i < items.length; i++) {
            for (var y = 0; z < transactions.length; y++) {
                if (items[i]._id === transactions[i].itemID) {
                    results.push(transactions[i]);
                    break;

                }
            }
        }

        next(results);
    
    })


    .then(function(next, results) {
        res.jsonp(200, {
            transactions : results

        });
    });
});

/**
 * Simple route middleware to ensure user is authenticated.
 * Use this route middleware on any resource that needs to be protected. If
 * the request is authenticated (typically via a persistent login session),
 * the request will proceed. Otherwise, the user will be redirected to the
 * login page.
 */
function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.authenticated) {
        return next();

    } else {
        res.redirect('/login');

    }
}
