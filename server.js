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

//define our schemas and collections/models:
const userSchema = new mongoose.Schema({
  id: String,
  username: String
});
const newUsers = mongoose.model("newusers", userSchema);
const exerciseSchema = new mongoose.Schema({
  username: String,
  id: String, // storing the string version _id as it comes into the API as a string
  count: Number,
  log: []
});
const exerciselogs = mongoose.model("exerciselogs", exerciseSchema);
console.log(mongoose.connection.readyState);

//add static file - style.css
//app.use("/public", express.static(process.cwd() + "/public"));   isn't working with /public route
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

//define some functions to access the DB that are available to all API endpoints
// getUserID(username)
//getAllUsers
// getUserName(id)
//saveUser
//saveExercise

// get users id from username:
async function getUserId(username, done) {
  existingUser = false;
  await newUsers
    .findOne({ username: username }) //find existing, else it's new user })
    .exec()
    .then(docs => {
      if (docs) {
        existingUser = true;
        console.log(
          "line 88 Existing user " + docs.username + "FOUND " + docs.id
        );
        done(null, docs.id);
      } else console.log("no docs found for " + username);
    })
    .catch(err => {
      console.log(err + "Couldn't access database to check for user ID");
      done(err);
    });
}

// function to get all users:       called at line 423

async function getAllUsers(done) {
  let userList = await newUsers.find({}, { id: 1, username: 1, _id: 0 });
  try {
    console.log("line 103 userlist = " + JSON.stringify(userList));
    //userList=Object.entries(userList)
    done(null, userList);
  } catch (err) {
    console.log(err);
    done(err);
  }
}

// get username from userId

async function getUserName(id, done) {
  var allUsers;
  let thisUser = await newUsers.find({ id: id });
  //await getAllUsers((err, data)=>{
  //     if(err){
  //       console.log(err);
  //       done(err);
  //     }
  //     else{
  //       allUsers=data;
  //       done(null, data);

  //     }
  //   });
  console.log("line 137 " + JSON.stringify(thisUser));

  // for(var a; a<allUsers.length; a++) {
  //   console.log("allUsers[a] is "+allUsers[a]);
  //     if (allUsers[a].id == id) {
  //         username=allUsers[a].username;
  //         console.log("line 146 "+allUsers[a]);
  //     }
  // }
  done(null, thisUser);
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
        console.log("line 161 found " + JSON.stringify(data));
        userLog = data;
        return done(null, userLog);
      } else console.log("no data at line 168" + data);
    });
  } // if id:null closed
  else {
    console.log("175 id = " + id);
    await exerciselogs.find({ id: id }, async function(err, data) {
      // was not retrieving any docs, so will filter by id later
      if (err) {
        console.log(err);
        done(err);
      }
      if (data) {
        //exerciseObject=data;
        console.log("Line 178 got data ");
        return done(null, data);
      } else console.log("no data at line 181");
    });
  }
}

//  textbook approach:
async function saveUser(person, done) {
  //var createAndSavePerson = function(person, done) {
  await person.save(async function(err, data) {
    console.log("line 189 save results " + data);
    if (err) {
      console.error(err);
      done(err);
    } else done(null, data);
  });

  //return true;   no need to return anything from save
}

// this function will create our document in the database ie. creates log array ect
async function saveThisHasAllLogsForUser(exerciseModel, done) {
  //called at 356
  try {
    await exerciseModel.save(done);
  } catch (err) {
    console.log("Line 209" + err);
    done(err);
  }
}
// function to save exercise log in existing DB document- called at line...241 and line 323
async function saveExercise(log, done) {
  var returnMe;
  console.log("at line 216 id is " + log.id);

  await exerciselogs.findOne({ id: log.id }, async function(err, results) {
    if (err) {
      console.log(err);
      done(err);
    } else {
      results.count++; //increments counter
      //log=log[0];
      console.log("line 228" + JSON.stringify(log));
      results.log.push({
        id: log.id,
        description: log.description,
        duration: log.duration,
        date: log.date
      });
      results
        .save()
        .then(result => {
          console.log("save completed at line 236 " + result);
          done(null, result);
        })
        .catch(err => {
          console.log(err);
        });
    }
  });
  // await exerciselogs.findOneAndUpdate(
  //     { id: log.id },
  //     {
  //       $push: {
  //         log: log
  //       },
  //       $inc: {
  //         count: 1
  //       }
  //     },
  //     { upsert: true, new: true, lean: true }, //done());
  //    function(err, results){
  //      if(err){
  //            console.log("line 218"+err);
  //            done(err);
  //        }
  //        else{
  //          console.log("Line 220 "+JSON.stringify(results));
  //          returnMe=results;
  //          done(null, results);
  //        }});
}

// recieves submit data for user name- db will return id to use for logging exercises
app.post("/api/exercise/new-user", async function(req, res) {
  const { username } = req.body; //destructure POST variables
  let log = []; // log will store exercise logs in the array of each user
  var date = new Date(); //  use current date

  console.log("about to look up user " + username+" req is "+JSON.stringify(req.body));
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

    var user = new newUsers({
      id: shortid.generate(), //Auto Generate to avoid type conversions
      username: username
    });

    //    create the exercise file in the database to update with exercises

    let exerciseModel = new exerciselogs({
      username: username,
      id: user.id,
      count: 0,
      log: []
    });

    // Save our model and exercise logs to DB
    try {
      await saveUser(user, function(err, result) {
        if (err) {
          console.log(err + "@line 322");
        }
        if (result) {
          console.log(user + "saved at line 325" + result);
        }
      });
    } catch (err) {
      console.log(err);
    }

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

    return res.json({ username: req.body.username, _id: user.id });
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
  var userdata;
  var results;
  var classDate;
  var dateString;
  var savedData = {}; // savedData will hold updated record from DB
  var { userId, description, duration, date } = req.body;
  console.log("req.body is "+JSON.stringify(req.body));
  if (+duration == NaN) {
    // use the Unary Opperator to covert type to Number
    return res.send("please enter proper duration in minutes ");
  } else duration = parseInt(duration);
  console.log("line 390 duration is type :" + typeof duration);
  console.log("Date is " + date);
  if (date == null || date == "") {
    date = new Date();
  }
  classDate = new Date(date);

  // if (date.getTime !=date) {
  //   date = new Date(); // if no date make now the new date
  // }

  dateString = classDate.toString();

  //dateString = date.toString();
  console.log("this should be a string " + dateString);
  var newLog = {
    //update to match format
    id: userId,
    description: req.body.description,
    duration: duration,
    date: dateString
  };

  await getUserName(userId, async function(err, data) {
    //defined at line 148
    if (err) {
      console.log("line 417 Error " + err);
    } else {
      console.log(" line 420 name..." + data);
      userdata = data[0];
    }
    //console.log("typeOf duration is "+typeof(newLog.duration));
    console.log("Line 413 username is " + userdata.username);
  });

  await saveExercise(newLog, async function(err, result) {
    //defined at line 205
    if (err) console.log(err);
    else {
      console.log("success at 395 "); //+result.toString());    // result of save not needed
      results = result;
      console.log("line 399" + JSON.stringify(results.log));

      res.json({
        _id: userId,
        username: userdata.username,
        date: newLog.date,
        duration: newLog.duration,
        description: newLog.description
      });
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
app.get("/api/exercise/log/:userId?/:from?/:to?/:limit?", async function(
  req,
  res
) {
  var { userId, from, to, limit } = req.query; // load userName in URL query ?userN=tara
  //var key;
  var output;
  let theUserName;

  console.log("from and to :" + from, to);
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
  console.log("userId =" + userId);
  await getUserLog(userId, async function(err, docs) {
    // defined at line 151 and can handle userId=null if so
    if (err) return res.send("error getting documents");
    else {
      if (docs == null) {
        console.log("warning - docs=null");
      }
      exerciseArray = docs[0];
      exerciseObject = docs; //Object.entries(docs[1]);                 can use log.count too
      console.log(
        "495 docs are found # of logs is " +
          exerciseObject[0].log.length +
          "confirmed and is type " +
          typeof exerciseObject
      ); //+JSON.stringify(exerciseArray));

      //return res.json({ docs}); // if no id, display all logs)
    }
  });
  if (userId == null) {
    console.log("501 userId is null");
  } else {
    // below skipped if no userId
    exerciseArray = Object.entries(exerciseObject);
    console.log("exercise ARRAY is same as object"); //+JSON.stringify(exerciseArray));
    //didn't seem to be able to extract an array, using original object
    //key=Object.keys(exerciseObject[0].log[0]);
    theUserName = exerciseObject[0].username;
    output = exerciseObject[0].log;

    let logCount = exerciseObject[0].count;
    console.log("Line 513 log count is " + logCount); //JSON.stringify(exerciseObject[0].count));
    //console.log("Line 508 extracted exercise array"+JSON.stringify(exerciseObject[0].log));
    console.log(exerciseObject[0].username + " is our username :)");
    //console.log("Line 509 extracted date " +JSON.stringify(exerciseObject[0].log.log.date));

    //    exerciseArray[0][0].shift();
    //exerciseArray=Object.entries(exerciseArray[0]);
    //    console.log("Line 521 keys in Arr[0].log keys are: " +key);
    //exerciseArray=exerciseArray[1];  // eliminate first item(err=null)
    //exerciseArray=Object.entries(exerciseArray);
    console.log(
      "line 524 " +
        " Access items like description : " +
        JSON.stringify(exerciseObject[0].log[0].description)
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
  }
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
    let output2 = JSON.stringify(output);

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
    var counter = exerciseObject[0].log.length;
    console.log(
      "line 612 " +
        exerciseObject[0].log.length +
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
            exerciseObject[0].log[i].date
        );
        docDate = new Date(exerciseObject[0].log[i].date);
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
          exerciseObject[0].log.splice(i, 1);

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
        console.log("try " + exerciseObject[0].log[i].date);
        docDate = new Date(exerciseObject[0].log[i].date);
      } catch (err) {
        console.log(err + " no data at i = " + i);
      }
      if (docDate) {
        console.log("line 660 " + docDate);
        // exerciseArray.filter(log=>{
        if (From.getTime() > docDate.getTime()) {
          console.log("found 1 to delete on " + docDate);
          exerciseObject[0].log.splice(i, 1);
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
    if (exerciseObject[0].log.length > limit) {
      console.log("trim results to meet limit " + limit);
      exerciseObject[0].log.splice(limit);
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
        JSON.stringify(exerciseObject[0].log) +
        "count:" +
        exerciseObject[0].count
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
