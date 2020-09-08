const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { body, validationResult } = require('express-validator');
const cors = require("cors");
const mongoose = require("mongoose");
const shortid = require("shortid");
var ourUserArray = []; // this will hold our users from DB
var exerciseObject = {};


var finalDocArray = [];
mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useCreateIndex: true
}); // if using node.js- || 'mongodb://localhost/exercise-track' )
// Make Mongoose use `findOneAndUpdate()`. Note that this option is `true` by default, you need to set it to false.
mongoose.set("useFindAndModify", false);
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var exerciseSchema = new mongoose.Schema({
  username: String,
  id: String, // storing the string version _id as it comes into the API as a string
  count: Number,
  exercises: [{
      description: String, 
      duration: Number,
      date: Date,
    }]
});
const exerciselog = mongoose.model("newexerciselogs", exerciseSchema);
console.log(mongoose.connection.readyState);

//add static file - style.css
//app.use("/public", express.static(process.cwd() + "/public"));   //isn't working with /public route
app.use(express.static(process.cwd() + "/public"));
//define our routes
app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Not found middleware - caused error - err handled locally
//app.use((req, res, next) => {
//  return next({status: 404, message:req.body.new+'not found'})
//})
// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;
    res({error:err});
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

// global variable definitions:
var username;
var existingUser = false;

//These all Should be in seperate files... model/index.js define some functions to access the DB that are available to all API endpoints
// getUserID(username)
//getAllUsers
// getUserName(id)
//saveExercise

// get users id from username:
async function getUserId(username, done) {
  existingUser = false;
  let ourId;
  await exerciselog
    .findOne({ username: username }) //find existing, else it's new user })
    .exec()
    .then(docs => {
      if (docs) {
        existingUser = true;
        ourId = docs.id;
        console.log(
          "line 88 Existing user " + docs.username + "FOUND " + ourId
        );
        done(null, docs);
      } else {
        console.log("no docs found for " + username);
        done(null, false);
      }
    })
    .catch(err => {
      console.log(err + "Couldn't access database to check for user ID");
      done(err);
    });
}

// function to get all users:       called at line 423

async function getAllUsers(done) {
  let userList = await exerciselog.find({}, { id: 1, username: 1, _id: 0 });
  try {
    console.log("line 107 userlist found"); //+ Object.keys(userList))=num; //userList[Object.keys(userList)[1]])=obj@[1];
    console.log(
      "line 113 userlist 3rd element is= " + JSON.stringify(userList[3])
    );
    done(null, userList);
  } catch (err) {
    console.log(err);
    done(err);
  }
}
// get username from userId
async function getUserName(id, done) {
  let thisUser = await exerciselog.find({ "id": id });
  console.log("line 137 count is: " + (thisUser[0].count));
if(thisUser[0].username){
  done(null, thisUser[0].username);
}
  else done(null, null);
}

// function to find all users logs
async function getUserLog(id, done) {
  //called at line 530
  var userLog;
  var allUsers;
  console.log("line 154 id is " + id);
  if (id == null) {
    console.log("id=null at line 156");
    await exerciselog.find({}, { _id:0 }, async function(err, data) {
      if (err) {
        console.log(err);
        done(err);
      }
      if (data) {
        console.log("line 161 found " + JSON.stringify(data.log));
        userLog = data;
        return done(null, userLog);
      } else console.log("no data at line 168" + data);
    });
  } // if id:null closed
  else {
    //console.log("165 id = " + id); - console logs can cause server to restart so console.log No Bueno here
    await exerciselog.find({ id: id }, {_id:0}, async function(err, data) {
      if (err) {
        console.log(err);
        done(err);
      }
      if (data) {
        console.log("Line 178 got data for " + data[0].username);
        return done(null, data);
      } else console.log("no data at line 181");
    });
  }
}

// this function will create our document in the database which holds log array ect
async function saveThisHasAllLogsForUser(exerciseModel, done) {
  try {
    await exerciseModel.save(done);
  } catch (err) {
    console.log("Line 209" + err);
    done(err);
  }
}
// function to save exercise log in existing DB document- called at line...241 and line 323
async function saveExercise(userId, log, done) {
  console.log("at line 216 id is not known until we get the response from the DB below");

  await exerciselog.findOneAndUpdate(
    { id: userId },
    {
      $push: {
        exercises: log
      },
      $inc: {
        count: 1
      }
    },
    { upsert: true, new: true, lean: true, "fields": { "_id":0, "exercises._id":0}}, //done());
    function(err, result) {
      if (err) {
        console.log("line 218" + err);
        done(err);
      } else {
        console.log("Line 220 " + JSON.stringify(result.username));
        
        done(null, result);
      }
    }
  );

  
}

// recieves submit data for user name- db will return id to use for logging exercises
app.post("/api/exercise/new-user", async function(req, res) {
  const { username } = req.body; //destructure POST variables
  let log = []; // log will store exercise logs in the array of each user
  var date = new Date(); //  use current date

  console.log(
    "about to look up user " + username + " req is " + JSON.stringify(req.body)
  );
  console.log("connection State:" + mongoose.connection.readyState);

  // accessing db from a function call as per convention
  //if (username==null) { return res.send("Must enter username");}

  await getUserId(username, function(err, result) {
    //getUserId also sets existingUser true if so
    if (err) {
      console.log(err);
      return res.send(err);
    }
    if (result) {    
      console.log("line 293 found user " + result.toString());
      res.json({ message: "username already taken id:"+result.id });
      //return res.json({ exisitingUser: 'foundTrue', message:'If u are a new user please choose another username',  username: username, _id: result.toString()});
    }
    else existingUser=false;
  });

  
  //save new user's profile
  if (!existingUser) {
    console.log("Schema creation at line 300");
  
    const exerciseModel = new exerciselog({
      username: username,
      id: shortid.generate(),
      count: 0,
      exercises: []
    });

    try {
      await saveThisHasAllLogsForUser(exerciseModel, function(err, result) {
        if (err) {
          console.log(err + "@line 355");
        }
        if (result) {
          console.log(exerciseModel + "saved at line 358");
          return res.json({username: result.username, _id: result.id});
        }
      }); //located at line 129
    } catch (err) {
      console.log(err);
      return "error saving to data base" + err;
    }

    //return res.json({ username: req.body.username, _id: exerciseModel.id });
  }
});

// Get api/exercise/users to get an array of all users
app.get("/api/exercise/users/", async function(req, res) {
  await getAllUsers(function(err, result) {
    // defined at line 100
    if (err) console.log(err);
    return res.send(result);
  });
});



// this is where the exercise is logged 
app.post("/api/exercise/add", [ 
    body('date')  //validate date (debugging)
      .trim()
      .isISO8601()
      .withMessage('Invalid date')
      .isAfter(new Date(0).toJSON())
      .isBefore(new Date('2999-12-31').toJSON())
      .withMessage("Invalid Date")

    ], async function(req, res, next) {
  
  // handle data validation errors:
   const errors = validationResult(req.body.date)
    if (!errors.isEmpty()) {
      const { param, msg: message, } = errors.array()[0]
      return next({ param, message })
    }
  
  var classDate;
  var dateString;
  var username;
  var { userId, _id, description, duration, date } = req.body;
  if(!userId){
    if(_id){
      userId=_id;    //covers both cases
    }
  }
  if (!userId || !description || !duration) {
    res.send(
      "User ID, Description and Duration are required fields - please enter values...hit refresh to continue"
    );
  }
  console.log("req.body is " + JSON.stringify(req.body));
  if (+duration == NaN) {
    // use the Unary Operator to covert type to Number
    return res.send("please enter proper duration in minutes ");
  } else duration = parseInt(duration);
  console.log("Date is " + date);
  if (date == null || date == "") {
    date = new Date();
  }
  classDate = new Date(date);  
  dateString = classDate.toString();
  console.log("this should be a string " + dateString);
  if(dateString=="Invalid Date") return res.send("invalid date - Please try again");
  var newLog = {
    description: req.body.description,
    duration: duration,
    date: dateString
  };
// check if we have this user 
  getUserName(userId, async function(err, result){
    if (err) console.log(err);
    else {
      // console.log("success at 308"+result);
       if (result) {
         username=result;
      //   console.log(result +"Result at line 307");
       }
        if (result==null) {    // ie. this userID doesn't exist yet  - to pass test, must handle this:
          username=userId;    // just use userId as username if user not in db -needed to pass tests
          console.log("Schema creation at line 310");
        
          //create new db for this new user 
          const exerciseModel = new exerciselog({
            username: username,
            id: userId,
            count: 0,
            exercises: []
          });

    try {      // creates new user as per tests explained above
      await saveThisHasAllLogsForUser(exerciseModel, function(err, result) {
        if (err) {
          console.log(err + "@line 335");
        }
        if (result) {
          console.log(exerciseModel + "saved at line 338"+result);
        }
      }); //located at line 129
    } catch (err) {
      console.log(err);
      return "error saving to data base" + err;
    }
      }    //end no user in db
    }
  });  // got(or created) userName and file on DB 
  

  
  // add the exercise

  await saveExercise(userId, newLog, async function(err, result) {
    //defined at line 173
    if (err) console.log(err);
    else {
      console.log("success exercise saved at 428 "); //+result.toString());    // result of save not needed
      console.log("line 429 count is " + JSON.stringify(result.exercises[1]));
      res.json({userName:result.username, description:result.exercises[result.count-1].description, duration:result.exercises[result.count-1].duration, date:result.exercises[result.count-1].date});
     
//       res.json({
        
//         username: result.username,
//         _id: result.id,
//         description: newLog.description,
//         duration: newLog.duration,
//         date: newLog.date
//         // _id: userId,
//         // username: userdata.username,
//         // date: newLog.date,
//         // duration: newLog.duration,
//         // description: newLog.description
//       });
    }
  }); //saveExercise @ line 129


}); // closes this api endpoint


//to get user logs  querry from url     ?userName=p_ollie
app.get("/api/exercise/log/:userId?/:_id?:from?/:to?/:limit?", async function(
  req,
  res
) {
  var { userId, _id, from, to, limit } = req.query; // load userName in URL query ?userN=tara
  //var key;
  if(!userId){
    if(_id){
      userId=_id;    // incase user sends wrong name
    }
  }

  console.log(JSON.stringify(req.body) + "Line 473 from and to :" + from, to);
  if (from) {
    // convert String(input always type=string) to Date
    var From = new Date(from);
    console.log("from time is " + From.getTime());
    if (isNaN(From.getTime())) {
      // d.valueOf() could also work
      console.log("from date is not valid enter date yyyy-mm-dd");
      // date is not valid
      From = null;
    }
  }
  if (to) {
    var To = new Date(to); // convert to to Date
    if (isNaN(To.getTime())) {
      // d.valueOf() could also work
      // date is not valid
      console.log("from date is not valid enter date yyyy-mm-dd");
      To = null;
    }
  }
  console.log("line 445 userId =" + userId);
  await getUserLog(userId, async function(err, docs) {
    // defined at line 151 and can handle userId=null if so
    if (err) return res.send("error getting documents");
    else {
      if (docs == null||!docs) {
        console.log("warning - docs=null");
      }
      
      exerciseObject = docs; //Object.entries(docs[1]);                 can use log.count too
      count = exerciseObject[0].count;
      console.log(
        "480 docs are found # of logs is " +
          count +
          "confirmed and is type " +
          typeof exerciseObject
      ); 

      //return res.json({ docs}); // if no id, display all logs)
    }
  });
  if (userId == null || userId == 0) {
    console.log("466 userId is null");
  } else {
    // below skipped if no userId
    
    if (count = 0) {
      console.log("line 506 no entries in this userObject yet ");
    }
   
   //  console.log(JSON.stringify(exerciseObject[0].username) + " is our username line 530 :)");
    
    console.log(
      "line 524 " +
        " Access items like description : " +
        JSON.stringify(exerciseObject[0].exercises[0])
    ); 
    
  } // this ends the elseif handling defined user
  if (!To && !From && !limit) {
    
  }

  if (To) {
    //let toDate = new Date(to);
    //    if(new Date(element.date).toString()!=="Invalid Date"&& element.date){
    var counter = exerciseObject[0].exercises.length;
    console.log(
      "line 612 " +
        exerciseObject[0].exercises.length +
        " is arrayLength," +
        counter +
        " and compare to date: " +
        To
    );
    //for (let logs in exerciseObject[0].log){
    //let docDate= new Date(logs.date);
    let docDate = null;
    for (var i = 0; i < counter; i++) {
      //if(exerciseObject[0].log[i].date)
      try {
        console.log(
          "i is" +
            i +
            "counter is " +
            counter +
            "date is " +
            exerciseObject[0].exercises[i].date
        );
        docDate = new Date(exerciseObject[0].exercises[i].date);
        console.log("docDate is " + docDate);
        //exerciseObject[0].log[0].log.date
      } catch (err) {
        console.log(err + " @ line 610");
      }
      console.log(
        To + To.getTime() + " is To Limit, compare date is: " + docDate
      );
      if (docDate) {
        if (To.getTime() < docDate.getTime()) {
          // if date is after 'to', delete that element
          exerciseObject[0].exercises.splice(i, 1);

          // delete exerciseObject[0].log[i];
          exerciseObject[0].count--;
          console.log(
            i +
              " is i and 630 it worked item deleted" +
              " log count is now = " +
              exerciseObject[0].count
          );
          counter--; // because we deleted this pull counter back
          i--; // same for i;
          //}
        }
      }
    }
  }
  if (From) {
    //let fromDate = new Date(from);

    var count = exerciseObject[0].count;
    console.log("line 644 log Count is " + count);
    let docDate = null;
   
    for (var i = 0; i < count; i++) {
      console.log(i + " is i and line 650 date is ");
      try {
        console.log("try " + exerciseObject[0].exercises[i].date);
        docDate = new Date(exerciseObject[0].exercises[i].date);
      } catch (err) {
        console.log(err + " no data at i = " + i);
      }
      if (docDate) {
        console.log("line 660 " + docDate);
        
        if (From.getTime() > docDate.getTime()) {
          console.log("found 1 to delete on " + docDate);
          exerciseObject[0].exercises.splice(i, 1);
             exerciseObject[0].count--;
          count--; //because our exercise log list is now shorter
          i--; //this loop's counter reacts to deleted object
          console.log(
            From +
              " is 'from' Date so deleted element " +
              " count is now " +
              count +
              "=" +
              exerciseObject[0].count
          ); //+exerciseObject[0].log.length);
        }
      }
    }
    console.log(
      "line 668  Done.  Log count is " + JSON.stringify(exerciseObject[0].count)
    );
   }
  if (limit) {
    if (exerciseObject[0].exercises.length > limit) {
      console.log("trim results to meet limit " + limit);
      exerciseObject[0].exercises.splice(limit);
    }
  }
  if (!userId) {
    res.json(exerciseObject);
  } else {
    res.json(exerciseObject[0]);
      //[
//       "_id:" +
//         exerciseObject[0].id +
//         ", username:" +
//         exerciseObject[0].username +
//         ", " +
//       "count:"  +
//         exerciseObject[0].count +", "+
//       "log:"+
//         JSON.stringify(exerciseObject[0].log) 
        
//     );
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

//delete database - not used
// async function deleteCollectionMongoDB(done){
//   try{
//   var message=ExerciseModel.delete({});
//   done(null, message);
//   }
//   catch(err){
//       console.log(err);
//       done(err);
//     }
//     // if(){
//     //  console.log("Line 158 data ="+data);
//     //   done(null, data);
//     // }
// }

// deleteCollectionMongoDB( function(err, message){
//   console.log("attempting to delete collection now");
//   if(err){
//       console.log(err);

//     }
//     if(message){
//      console.log("Line 158 data ="+message);
//     }
// });
