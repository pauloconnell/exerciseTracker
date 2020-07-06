const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const shortid = require("shortid");
var ourUserArray = []; // this will hold our users from DB
var exerciseObject = {};
var exerciseArray = []; // this will hold our info for 'this' user

var finalDocArray = [];
var ourUserName;
mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useCreateIndex: true
}); // if using node.js- || 'mongodb://localhost/exercise-track' )
// Make Mongoose use `findOneAndUpdate()`. Note that this option is `true` by default, you need to set it to false.
mongoose.set("useFindAndModify", false);
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const exerciseSchema = new mongoose.Schema({
  username: String,
  id: String, // storing the string version _id as it comes into the API as a string
  count: Number,
  exercise: [{
      description: String, 
      duration: Number,
      date: Date
    }]
});
const exerciselogs = mongoose.model("exerciselogs", exerciseSchema);
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
  await exerciselogs
    .findOne({ username: username }) //find existing, else it's new user })
    .exec()
    .then(docs => {
      if (docs) {
        existingUser = true;
        ourId = docs.id;
        console.log(
          "line 88 Existing user " + docs.username + "FOUND " + ourId
        );
        done(null, ourId);
      } else console.log("no docs found for " + username);
    })
    .catch(err => {
      console.log(err + "Couldn't access database to check for user ID");
      done(err);
    });
}

// function to get all users:       called at line 423

async function getAllUsers(done) {
  let userList = await exerciselogs.find({}, { id: 1, username: 1, _id: 0 });
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
  let thisUser = await exerciselogs.find({ id: id });
  console.log("line 137 " + (thisUser[0].username));

  done(null, thisUser[0].username);
}

// function to find all users logs
async function getUserLog(id, done) {
  //called at line 530
  var userLog;
  var allUsers;
  console.log("line 154 id is " + id);
  if (id == null) {
    console.log("id=null at line 156");
    await exerciselogs.find({}, { _id: 0 }, async function(err, data) {
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
    await exerciselogs.find({ id: id }, async function(err, data) {
      if (err) {
        console.log(err);
        done(err);
      }
      if (data) {
        console.log("Line 178 got data " + data);
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
  var returnMe;
  console.log("at line 216 id is not known until we get the response from the DB below");

  await exerciselogs.findOneAndUpdate(
    { id: userId },
    {
      $push: {
        exercise: log
      },
      $inc: {
        count: 1
      }
    },
    { upsert: true, new: true, lean: true, "fields": { "_id":0}}, //done());
    function(err, results) {
      if (err) {
        console.log("line 218" + err);
        done(err);
      } else {
        console.log("Line 220 " + JSON.stringify(results.username));
        returnMe = results;
        done(null, results);
      }
    }
  );

  // await exerciselogs.findOne({ id: userId }, async function(err, results) {
  //   if (err) {
  //     console.log(err);
  //     done(err);
  //   } else {
  // results.count++; //increments counter
  // console.log("line 228" + JSON.stringify(log));
  // results.log.push({
  //   description: log.description,
  //   duration: log.duration,
  //   date: log.date
  // });
  // results
  //   .save()
  //   .then(result => {
  //     console.log("save completed at line 236 " + result);
  //     done(null, result);
  //   })
  //   .catch(err => {
  //     console.log(err);
  //   });
  // docs in      results.log

  //    }
  //  });
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
    if (existingUser) {
      console.log("line 293 found user " + result.toString());
      res.json({ message: "username already taken" });
      //return res.json({ exisitingUser: 'foundTrue', message:'If u are a new user please choose another username',  username: username, _id: result.toString()});
    }
  });

  // accessing db directly - not proper convention use function instead
  //     async function getAllUsers(){

  //       await UserModel
  //         .findOne({ username: username }) //find existing, else it's new user })
  //         .exec()
  //         .then(docs => {
  //           if (docs) {
  //             existingUser = true;
  //             console.log("Existing user " + docs.username + "FOUND " + docs._id);
  //             return res.json(docs);
  //           }
  //           else return null;
  //         })
  //         .catch(err => {
  //           console.log(err);
  //           res.send(err + "Couldn't access database to check for user ID");
  //         });
  //     }

  //save new user's profile
  if (!existingUser) {
    // set in getUserId
    // if (req.body.date) {
    //   let stringToDate = new Date(req.body.date); //if date given...
    //   if (stringToDate.getTime() != NaN) {
    //     // ensure valid date
    //     date = new Date(req.body.date); //convert string to date
    //   }
    // }
    console.log("Schema creation at line 300");
    //Object ID creation options:  using shortid.generate() = String
    //var _id= new mongoose.Types.ObjectId();  //creates our _id = ObjectId

    // var user = new newUsers({
    //   id: shortid.generate(); //Auto Generate to avoid type conversions
    //   username: username
    // });

    //    create the exercise file in the database to update with exercises

    const exerciseModel = new exerciselogs({
      username: username,
      id: shortid.generate(),
      count: 0,
      log: []
    });

    try {
      await saveThisHasAllLogsForUser(exerciseModel, function(err, result) {
        if (err) {
          console.log(err + "@line 355");
        }
        if (result) {
          console.log(exerciseModel + "saved at line 358");
        }
      }); //located at line 129
    } catch (err) {
      console.log(err);
      return "error saving to data base" + err;
    }

    return res.json({ username: req.body.username, _id: exerciseModel.id });
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
app.post("/api/exercise/add", async function(req, res) {
  var userData;
  var results;
  var classDate;
  var dateString;
  var savedData = {}; // savedData will hold updated record from DB
  var { userId, _id, description, duration, date } = req.body;
  if(!userId){
    if(_id){
      userId=_id;
    }
  }
  if (!userId || !description || !duration) {
    res.send(
      "User ID, Description and Duration are required fields - please enter values..."
    );
  }
  console.log("req.body is " + JSON.stringify(req.body));
  if (+duration == NaN) {
    // use the Unary Opperator to covert type to Number
    return res.send("please enter proper duration in minutes ");
  } else duration = parseInt(duration);
  console.log("Date is " + date);
  if (date == null || date == "") {
    date = new Date();
  }
  classDate = new Date(date);
  if (!userId || !description || !duration) {
    return res.send(
      "User ID, Description and Duration are required fields - please enter values...hit refresh to continue"
    );
  }
  // if (date.getTime !=date) {
  //   date = new Date(); // if no date make now the new date
  // }

  dateString = classDate.toString();

  //dateString = date.toString();
  console.log("this should be a string " + dateString);
  var newLog = {
    description: req.body.description,
    duration: duration,
    date: dateString
  };

  // await getUserName(userId, async function(err, username) {
  //   //defined at line 148
  //   if (err) {
  //     console.log("line 417 Error " + err);
  //   } else {
  //     console.log(" line 420 name: " + username);
  //     userData = username;
  //   }
  //   //console.log("typeOf duration is "+typeof(newLog.duration));
  //   console.log("Line 427 username is " + username);
  // });

  await saveExercise(userId, newLog, async function(err, result) {
    //defined at line 205
    if (err) console.log(err);
    else {
      console.log("success at 428 "); //+result.toString());    // result of save not needed
      results = result;
      console.log("line 429" + JSON.stringify(results));
      res.json(results);
      results = JSON.stringify(result);
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

  //console.log("line 343 " +results);

  //console.log("username ="+userdata.username+"our result =" + JSON.stringify(results));
  // res.json({ "_id":userId, "username":userdata.username, results });

  //res.json({"_id":results[0].id,"username":results[0].username,"count":fltr.length,"log":fltr})

  //  console.log("username"+updatedFile.username+"description"+updatedFile.log[updatedFile.count-1].description+"duration"); //+savedData.log[updatedFile.count-1].duration+"_id"+savedData.id+"date"+updatedFile.log[updatedFile.count-1].date);

  //    res.json({"username":updatedFile.username,"description":updatedFile.log[updatedFile.count-1].description,
  //            "duration":savedData.log[updatedFile.count-1].duration,
  //            "_id":savedData.id, "date":updatedFile.log[updatedFile.count-1].date })
  //return res.json();

  // try{
  //}    // closes try{}
  // catch (err){
  //        if (err){
  //          console.log("error line 245");
  //          res.status(500).send({ error: err.toString });
  //        }
  //          // return res.send( doc._id+ doc.log[doc.log.length-1]);  // now true: returns NEW doc-pulled out Log
  // }
}); // closes this api endpoint

//to get user logs  querry from url     ?userName=p_ollie
app.get("/api/exercise/log/:userId?/:_id?:from?/:to?/:limit?", async function(
  req,
  res
) {
  var { userId, _id, from, to, limit } = req.query; // load userName in URL query ?userN=tara
  //var key;
  var output;
  let theUserName;
  if(!userId){
    if(_id){
      userId=_id;
    }
  }
  console.log(req + "Line 473 from and to :" + from, to);
  if (from) {
    // convert String to date
    var From = new Date(from);
    console.log("from time is " + From.getTime());
    if (isNaN(From.getTime())) {
      // d.valueOf() could also work
      console.log("from date is not valid enter date yyyy-mm-dd");
      // date is not valid
      from = null;
    }
  }
  if (to) {
    var To = new Date(to); // convert to to Date
    if (isNaN(To.getTime())) {
      // d.valueOf() could also work
      // date is not valid
      console.log("from date is not valid enter date yyyy-mm-dd");
      to = null;
    }
  }

  let logCount = 0;
  console.log("line 445 userId =" + userId);
  await getUserLog(userId, async function(err, docs) {
    // defined at line 151 and can handle userId=null if so
    if (err) return res.send("error getting documents");
    else {
      if (docs == null||!docs) {
        console.log("warning - docs=null");
      }
      //exerciseArray = docs[0];
      exerciseObject = docs; //Object.entries(docs[1]);                 can use log.count too
      count = exerciseObject[0].exercise.length;
      console.log(
        "480 docs are found # of logs is " +
          count +
          "confirmed and is type " +
          typeof exerciseObject
      ); //+JSON.stringify(exerciseArray));

      //return res.json({ docs}); // if no id, display all logs)
    }
  });
  if (userId == null || userId == 0) {
    console.log("466 userId is null");
  } else {
    // below skipped if no userId
    exerciseArray = Object.entries(exerciseObject);
    if (count > 0) {
      try {
        console.log(
          "exercise ARRAY is same as object " + exerciseObject[0].username
        ); //+JSON.stringify(exerciseArray));
        output = exerciseObject[0].exercise;
        logCount = exerciseObject[0].count;
      } catch (err) {
        console.log("ERROR ERROR ERROR At line 502 " + err);
      }
    } else {
      console.log("line 506 no entries in this userObject yet ");
    }
    //didn't seem to be able to extract an array, using original object
    //key=Object.keys(exerciseObject[0].log[0]);
    //theUserName = exerciseObject[0].username;

    console.log(JSON.stringify(exerciseObject) + "Line 489 log count is " + logCount); //JSON.stringify(exerciseObject[0].count));
    //console.log("Line 508 extracted exercise array"+JSON.stringify(exerciseObject[0].log));
    console.log(JSON.stringify(exerciseObject[0].username) + " is our username line 530 :)");
    //console.log("Line 509 extracted date " +JSON.stringify(exerciseObject[0].log.log.date));

    //    exerciseArray[0][0].shift();
    //exerciseArray=Object.entries(exerciseArray[0]);
    //    console.log("Line 521 keys in Arr[0].log keys are: " +key);
    //exerciseArray=exerciseArray[1];  // eliminate first item(err=null)
    //exerciseArray=Object.entries(exerciseArray);
    console.log(
      "line 524 " +
        " Access items like description : " +
        JSON.stringify(exerciseObject[0].exercise[0])
    ); // +exerciseObject.toString());
    // we have already selected userId logs so this is redundant:
    // var result=exerciseArray.filter((doc)=>{
    //   return doc.id==userId;
    // });
    //var result=exerciseArray;
    console.log("line 533 " + typeof exerciseArray); // arrays are loaded into the first element
    //result[0].shift();    // was extra number at start of array
    console.log("line 534 count of logs is " + exerciseObject[0].count);
    //exerciseObject[0].log[0].date
    //june 16
    //var newArray=[];

    // for (var b=0; b<exerciseArray.length; b++){
    //   console.log("line 462"+exerciseArray[b][1].id+"compare to "+userId);
    //   if (exerciseArray[b][1].id == userId){
    //       newArray =exerciseArray[b];
    //       console.log("found and added "+exerciseArray[b][1].id);
    //   }
    // }
    //exerciseArray=newArray;
    //console.log("469 check"+newArray);
  } // this ends the elseif handling defined user
  //}
  //   else{ //if (userId) {
  //     console.log("look up userId ="+userId);
  //     await getUserLog(userId, async function(err, logs){  //defined at line  152
  //       if(err) return res.send('error getting documents');
  //       else{
  //           exerciseArray=logs;
  //           console.log("line 466 "+logs)
  //         }
  //       });
  //     console.log("Line 457"+exerciseArray+
  //       userId +
  //         " request  logs for: " +
  //         userId +" from "+
  //         from +" to "+
  //         to +" limit # "+
  //         limit
  //     );
  // //console.log("line 468 looking for logs for userId:" + userId);
  // //     await getUserLog(userId, async function(err, log){      //defined at line 150

  // //       if(err) res.send(err+"error finding logs")
  // //       if (log) {
  // //           console.log("log found"+JSON.stringify(log));
  // //           //ourUserName = docs.username; //pull userName from DB
  // //           exerciseArray = log;
  // //           console.log("line 482 logs are " +exerciseArray+ JSON.stringify(exerciseArray));
  // //           //return res.send(log);
  // //         }
  // //     });
  //       } // closes if(id)
  if (!to && !from && !limit) {
    //if (exerciseArray != "") {
    // if no parameters set, return all docs for user
    console.log("line 580 sending exerciseObject");

    //return res.json({      //handeled together now
    // output
    //});
    //}else{
    // res.send("no dice exerciseArray is empty"+exerciseArray);
  }

  // first extract raw data into final array
  //console.log("line 512 exerciseArray is "+exerciseArray);
  //finalDocArray = Object.entries(exerciseObject);
  //use exerciseArray
  if (To) {
    //let toDate = new Date(to);
    //    if(new Date(element.date).toString()!=="Invalid Date"&& element.date){
    var counter = exerciseObject[0].exercise.length;
    console.log(
      "line 612 " +
        exerciseObject[0].exercise.length +
        " is arrayLength," +
        counter +
        " and compare to date: " +
        to
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
            exerciseObject[0].exercise[i].date
        );
        docDate = new Date(exerciseObject[0].exercise[i].date);
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
          exerciseObject[0].exercise.splice(i, 1);

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
    //    let tempArray = exerciseArray.filter(log => {
    for (var i = 0; i < count; i++) {
      console.log(i + " is i and line 650 date is ");
      try {
        console.log("try " + exerciseObject[0].exercise[i].date);
        docDate = new Date(exerciseObject[0].exercise[i].date);
      } catch (err) {
        console.log(err + " no data at i = " + i);
      }
      if (docDate) {
        console.log("line 660 " + docDate);
        // exerciseArray.filter(log=>{
        if (From.getTime() > docDate.getTime()) {
          console.log("found 1 to delete on " + docDate);
          exerciseObject[0].exercise.splice(i, 1);
          //         exerciseObject[0].log.shift();//this will delete first element
          //delete exerciseObject[0].log[i];
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
    //});
    //    for( var z=0; z<exerciseArray.log.length; z++){
    //    let logDate = new Date(exerciseArray.log[z].date);
    console.log(
      "line 668  Done.  Log count is " + JSON.stringify(exerciseObject[0].count)
    );
    //      if (From.getTime() > logDate.getTime()) {
    //        exerciseArray.splice(z,1);//this will delete this element
    //        if(z>0){ //set counter back if we pull item out of array
    //          z--;
    //        }
    //      } else return false;
    //    }
    //});
    //finalDocArray = tempArray;
  }
  if (limit) {
    if (exerciseObject[0].exercise.length > limit) {
      console.log("trim results to meet limit " + limit);
      exerciseObject[0].exercise.splice(limit);
    }
  }
  if (!userId) {
    res.json(exerciseObject);
  } else {
    res.send(
      "_id:" +
        exerciseObject[0].id +
        ", username:" +
        exerciseObject[0].username +
        ", " +
      "count:"  +
        exerciseObject[0].count +", "+
      "log:"+
        JSON.stringify(exerciseObject[0].exercise) 
        
    );
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
