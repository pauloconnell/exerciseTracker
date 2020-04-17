const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
mongoose.connect(process.env.DB_URI); // || 'mongodb://localhost/exercise-track' )
// Make Mongoose use `findOneAndUpdate()`. Note that this option is `true`
// by default, you need to set it to false.
mongoose.set('useFindAndModify', false);
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//define our schema:
const trackerSchema = new mongoose.Schema(
  {
    userName: String, // Schema for users and docs will be kept in []log
   // _id: Number,
    date: Date,
    count: Number,
    log: [
      {
        // this  log[] holds all logs for each user
        userName: String,
        description: String,
        duration: Number,
       // _id: Number,
        date: Date
      }
    ]
  }
  // not needed, but if it doesn't interfere, should use these
);
const trackerModel = mongoose.model("Tracker", trackerSchema);
console.log(mongoose.connection.readyState);

//add static file - style.css
//app.use("/public", express.static(process.cwd() + "/public"));   isn't working with /public route

let ourUserArray = []; // this will hold our users from DB
let ourDocsArray = []; // this will hold our info for 'this' user
var finalDocArray = [];
//define our routes
app.use(express.static(process.cwd() + "/public"));
app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Not found middleware
//app.use((req, res, next) => {
//  return next({status: 404, message:req.body.new+'not found'})
//})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;
  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

// recieves submit data for user name db will return _id to use for logging exercises
app.post("/api/exercise/new-user", async function(req, res) {
  const { username } = req.body; //destructure POST variables
  let existingUser = false; // we will get one or the other name or ID
  //check to see if our input is an ID
  if (username) {
    await trackerModel
      .findOne({ userName: username }) //description: "create profile" + username })
      .exec()
      .then(docs => {
        if (docs) {
          existingUser = true;
          console.log("Existing user " + docs.userName + "FOUND " + docs._id);
          //   document.addEventListener("click", function(){
          //     document.getElementById("dbData").innerHTML = ("Hello "+docs._id);
          //   });
          return res.json({
            username: username,
            _id: docs._id
            
          });
        }
      })
      .catch(err => {
        console.log(err);
        res.send(err + "Couldn't access database to check for user ID");
      });
  }
  console.log("about to look up user " + username);
  console.log("connection State:" + mongoose.connection.readyState);
  //create new user -

  //check if user name is used'
  // await trackerModel
  //   .findOne({ userName: username })
  //   .exec()
  //   .then(docs => {
  //     if (docs) {
  //       console.log(docs);
  //       existingUser = true;
  //       return res.json({
  //         "Existing User": docs.username,
  //         _id: docs._id
  //       });
  //     } else console.log("new user wasn't found in DB yet-saving");
  //   })
  //   .catch(err => {
  //     console.log(err);
  //     res.send(err + "Couldn't access database to check for username");
  //   });

  //save new user's profile
  if (!existingUser) {
    let date = new Date(); // if no date given, use this date
    if (req.body.date) {
      date = req.body.date;
    }
    console.log("Schema creation at line 130");
    //var _id= new mongoose.Types.ObjectId();  //creates our _id
    var tracker = new trackerModel({
      userName: username,
      
      date: date, //create profile used to search database to get unique user id for this user to store all logs under
      count: 0,  // count keeps track of # of workout logs
      log: [
        {
          userName: "create profile" + username,
          description: "create profile",
          duration: 0,
         //userId: auto added
          date
        }
      ]
    });
   // console.log(
   //   "Line 128 DB connection State is:" + mongoose.connection.readyState
   // );
    //save this document to the db
   // console.log(
      // "tracker to save to db=" +
      //   tracker +
      //   "saved to database :) _id= " +
      //   tracker._id
//    );
    await tracker.save(err => {
      if (err) {
        return "error saving to data base" + err;
      } else console.log("MongoDb has Stored " + tracker + " it's saved");
    });
    // Actual app would use document? to pre-set HTML user id @ input userId field
    res.json({ tracker });
  }
});

// Get api/exercise/users to get an array of all users
app.get("/api/exercise/users/", async function(req, res) {
  let arrayOfUserDocs = [];
  let arrayOfUsers = [];
  await trackerModel
    .find()
    .exec()
    .then(async docs => {
      arrayOfUserDocs.push(docs);
      arrayOfUserDocs = arrayOfUserDocs[0]; // array was in location[0]
      arrayOfUserDocs.forEach(user => {
        //for(var i=0; i<arrayOfUserDocs.length; i++){
        var thisUser = user.userName;
        console.log(thisUser);
        if (arrayOfUsers.indexOf(thisUser) == -1) {
          arrayOfUsers.push(thisUser);
        }
        //} closing for loop
      }); // closing forEach used instead

      res.send(arrayOfUsers);
    })
    .catch(err => {
      console.log(err);
    });
});

// this is where the exercise is logged
app.post("/api/exercise/add", async function(req, res) {
  var userName;
  let { userId, description, duration, date } = req.body;
  if (!date) {
    date = new Date();
  }
  //check if userId is in database
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    res.send(
      userId +
        "please enter valid userId, use create new user to look up your userId"
    );
  }
  // get userName from userId
  await trackerModel.findOne(
    {_id: userId})
    .exec()
    .then( async docs=>{
    userName=docs.userName;
  })
    .catch(err=> console.log("error occured while accessing DB looking up "+userId+" copy your userId again and retry"));
  
  
    console.log(
       "Line 209 about to get userName and save log. connection:" + mongoose.connection.readyState
    );
  var newLog = [{ userName, description, duration, userId, date }];
  //add data verification here
  var newDoc;
  try{
    await trackerModel
    .findOneAndUpdate(
      { _id: userId },
      {
        $push: {
          log: newLog
        },
        $inc: {
          count: 1
        }
       },{'new': true}
      // .then((doc)=>{
      //  newDoc=doc;
     // })
    );
    //return res.json(newDoc);
  }
  catch (err){
         if (err){
           console.log("error line 245");
           res.status(500).send({ error: err.toString });
         }
           // return res.send( doc._id+ doc.log[doc.log.length-1]);  // now true: returns NEW doc-pulled out Log    
  }
  
  //retrieve log in user obj to send back
  
  await trackerModel
    .findOne({"_id": userId })
     .exec()
     .then(docs => {
       if (docs) {
         res.json(docs);
       } else return res.send("No logs found");
     })
     .catch(err => {
       console.log(err);
       res.send("Couldn't access database to retrieve _id logs");
     });
  //   .exec()
  //   .catch(err => {
  //   console.log(err);
  //   res.send("Couldn't access database to check for username");
  // });
   // .then(async docs => {
   //   if (docs) {
   //     console.log("Yes- valid userId " + docs.userName + docs._id);
        //by default returns original before update-not needed
   //     console.log(docs);
   //     res.send("saved log for "+ docs.userName)
   //   } else
   //     return res.send(
   //       "No records found Please create new user first to get your ID"
    //    );

      // await trackerModel
      //   .findOne({ _id: userId })
      //   .exec()
      //   .then(async docs => {
      //     if (docs) {
      //       console.log("Yes- valid userId " + docs.userName + docs._id);
      //       //allow record to be made:
      // var tracker = new trackerModel({
      //   userName: docs.userName,
      //   log:{
      //     description: description,
      //     duration: duration,
      //     date: date}
      // });

      // use $push to add log to [] - same id?

      //        console.log(tracker.description + " saved to database :)  " + tracker);
      // await tracker.save(err => {
      //   if (err) {
      //     return "error saving to data base" + err;
      //   } else console.log("MongoDb has Stored " + tracker + " it's saved");
      // });
      // return res.json({"_id":docs._id,tracker}); // reDirect to show all logs rom this user?
      //  } // closes if (docs)   ie. if user ID is in database
      // else
      //   return res.send(
      //     "No records founPlease create new user first to get your ID"
      //   );
    //}); // ends .then()
    res.json(newDoc);
}); // closes this api endpoint

// get request to this api returns all logs for all users
//app.get("/api/exercise/log/", async function(req, res) {
//  console.log("looking up all logs");
// console.log("Line 160 connection:" + mongoose.connection.readyState);
// await trackerModel
//   .find()
//   .exec()
//   .then(docs => {
//     if (docs) {
//       res.json(docs);
//     } else return res.send("No logs found");
//   })
//   .catch(err => {
//     console.log(err);
//     res.send("Couldn't access database to check for username");
//   });
//});

// get request for specific user
//app.get("/api/exercise/log/:_id", async function(req, res) {
//  console.log("looking up all logs");
//  console.log("Line 160 connection:" + mongoose.connection.readyState);
//  await trackerModel
//    .find({"_id":req.body._id})
//    .exec()
//    .then(docs => {
//      if (docs) {
//        res.json(docs);
//      } else return res.send("No logs found");
//    })
//    .catch(err => {
//      console.log(err);
//      res.send("Couldn't access database to check for username");
//    });
//});

//
//to get user logs  querry from url     ?userName=p_ollie
app.get("/api/exercise/log/:_id?/:from?/:to?/:limit?", async function(
  req,
  res
) {
  let ourUserName = "";
  let { _id, from, to, limit } = req.query; // load userName in URL query ?userN=tara
  //_id=new mongoose.Types.ObjectId(_id);
  let logCount = 0;
  if (!_id) {
    await trackerModel
      .find()
      .exec()
      .then(docs => {
        return res.json({ id: "All", Logs: docs.length, docs }); // if no id, display all logs
      })
      .catch(err => {
        res.send(err);
      });
  }
  console.log(_id + from + to + limit);
  if (_id) {
    // if _id exists ensure it is valid
    if (!mongoose.Types.ObjectId.isValid(_id)) {
      res.send(
        _id +
          "please enter valid userId, use create new user to look up your userId"
      );
    }
    console.log(
      req.query._id +
        " passed ObjectId check - recieved request for logs for: " +
        _id +
        from +
        to +
        limit
    );

    // get userName from Db as all logs stored under user name
    // ie. each log get's it's own unique _id, so it's sorted by username
    await trackerModel
      .findById(_id)
      .exec()
      .then(async docs => {
        console.log("looking  for userName and logs for userId:" + _id);
        if (docs) {
          console.log("docs found");
          ourUserName = docs.userName; //pull userName from DB
          console.log("Docs are stored under user  " + ourUserName);
          // we will querry all logs with this username
        } else res.send("No files for user " + _id);
      })
      .catch(err => {
        res.send(err);
      });
  } // closes if(id)
  if (ourUserName) {
    // if we got it from DB find logs under that name
    await trackerModel
      .find({
        userName: ourUserName
      })
      .exec()
      .then(docs => {
        ourDocsArray = docs; // loads up our data into []
        logCount = docs[0].count
      });
  }
  if (!to && !from && !limit) {
    if (_id) {
      // if no parameters set, return all docs for user
      res.json(
         ourDocsArray
      );
    }
  }
  //})
  //.catch(err => {
  //  if (err) console.log(err);
  //  res.send(err);
  //});

  // this is where logic to 'trim' results doc should go

  // first extract raw data into final array
  finalDocArray = ourDocsArray;
  if (to) {
    let toDate = new Date(to);
    let counter = finalDocArray.length;
    console.log("compare to date: " + to);
    for (var i = 0; i < counter; i++) {
      let docDate = new Date(finalDocArray[i].log.date);
      console.log(
        toDate +
          toDate.getTime() +
          " compare date to " +
          docDate +
          docDate.getTime()
      );
      if (toDate.getTime() < docDate.getTime()) {
        // if date is after 'to', delete that element
        finalDocArray.splice(i, 1);
        console.log("it worked item deleted");
        i--; // because we deleted this index next one slide here
        counter--; //now reduce length to reflect new array
        //}
      }
    }
  }
  if (from) {
    let fromDate = new Date(from);
    if (!to) {
      // if 'to' not set, get all records for user
      finalDocArray = ourDocsArray[0];
    }
    let tempArray = finalDocArray.filter(log => {
      let logDate = new Date(log.date);
      console.log(logDate);
      if (fromDate.getTime() < logDate.getTime()) {
        return true;
      } else return false;
    });
    finalDocArray = tempArray;
  }
  if (limit) {
    if (finalDocArray.length > limit) {
      console.log("trim results to meet limit " + limit);
      finalDocArray.length = limit;
    }
  }
  // if (ourUserName) {
  //   if (!finalDocArray || finalDocArray.length < 1) {
  //     res.send("No docs found in those dates-try other date range");
  //   }
  //   res.send(
  //     ourUserName + " has " + finalDocArray.length + " logs " + finalDocArray
  //   );
  // }
  // closes if(ourUserName)
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
