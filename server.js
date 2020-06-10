const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const shortid = require("shortid");
var ourUserArray = []; // this will hold our users from DB
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
  existingUser=false;
  await newUsers.findOne({ username: username }) //find existing, else it's new user })
    .exec()
    .then(docs => {
      if (docs) {
        existingUser = true;
        console.log("line 88 Existing user " + docs.username + "FOUND " + docs.id);
        done(null, docs.id);
      } else console.log("no docs found for "+username);
    })
    .catch(err => {
      console.log(err+ "Couldn't access database to check for user ID");
      done(err) ;
    });
}

// function to get all users:       called at line 423

async function getAllUsers(done) {
  let userList = await newUsers.find({});
  try {
    console.log("line 103 userlist = "+JSON.stringify(userList));
    //userList=Object.entries(userList)
    done(null, userList);
  } catch (err) {
    console.log(err);
    done(err);
  }
  
}
async function getUser(userid, done) {
  let user= await newUsers.find({id:userid});
  try {
    console.log("user = "+user);
    //userList=Object.entries(userList)
    done(null, user);
  } catch (err) {
    console.log(err);
    done(err);
  }
  
}

// get username from userId

async function getUserName(id, done){
  var allUsers;
  await getAllUsers((err, data)=>{
    if(err){
      console.log(err);
      done(err);
    }
    else{
      allUsers=data;
      
    }
  });
  //console.log("line 137 " +allUsers.length+JSON.stringify(allUsers));
  
  for(var a; a<allUsers.length; a++) {
    console.log(allUsers[a]);
      if (allUsers[a].id == id) {
          username=allUsers[a].username;
          console.log("line 146 "+allUsers[a]);
      }
  }
  done(null, username);
}

// function to find all users logs
async function getUserLog(id, done){    //called at line 530
  var userLog;
  var allUsers;
  console.log("line 154 id is "+id);
  if(id==null){
    console.log("id=null at line 156");
    await exerciselogs.find({}, async function(err,data){
      
      if(err){
        console.log(err);
        done(err)
      }
      if(data){
        console.log("line 161 found "+JSON.stringify(data));
        userLog=data;
        return done(null, userLog);
      }
      else console.log("no data at line 168"+data);
    });
    
  }  // if id:null closed
    else{
      console.log("175 id = "+id);
    await exerciselogs.find({id:id}, async function(err, data){
      if(err){
        console.log(err);
        done(err);
      }
      if(data){
        exerciseArray=data;
       console.log("Line 178 data ="+data);
       return done(null, data);
      }
      else console.log("no data at line 181");
    });
  }
  
}



//  textbook approach:
async function saveUser(person, done) {
  //var createAndSavePerson = function(person, done) {
    await person.save(async function(err, data) {
      console.log("line 189 save results "+data);
      if (err) {
        console.error(err);
        done(err);
      }
      else done(null, data);
    });
  
  //return true;   no need to return anything from save
}
async function saveThisHasAllLogsForUser(exerciseModel, done){      //called at 356
  try{
    await exerciseModel.save(done);
    
    
  }
  catch(err){
    console.log("Line 209"+err);
    done(err);
  }
}
// function to save exercise log - called at line...241 and line 323
async function saveExercise(log, done) {
  var returnMe;
  console.log("at line 202"+log.id);
    await exerciselogs.findOneAndUpdate(
      { id: log.id },
      {
        $push: {
          log: log
        },
        $inc: {
          count: 1
        }
      },
      { new: true, lean: true }, //done());
     function(err, results){
       if(err){
             console.log("line 218"+err);
             done(err);
         }
         else{
           console.log("Line 220 "+results);
           returnMe=results;
           done(null, results);
         }});
  
}


// recieves submit data for user name- db will return id to use for logging exercises
app.post("/api/exercise/new-user", async function(req, res) {
  const { username } = req.body; //destructure POST variables
  let log = []; // log will store exercise logs in the array of each user
  var date = new Date(); // if no date given, use this date

  console.log("about to look up user " + username);
  console.log("connection State:" + mongoose.connection.readyState);

  // accessing db from a function call as per convention
   //if (username==null) { return res.send("Must enter username");}
        
        await getUserId(username, function(err, result){  //getUserId also sets existingUser true if so
          if(err){
            console.log(err);
            return res.send(err);
          }
          if (existingUser) {
          console.log("line 293 found user "+result.toString());
          return res.json({ username: username, _id: result.toString()});
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
  if (!existingUser) {      // set in getUserId
    if (req.body.date) {
      let stringToDate = new Date(req.body.date); //if date given...
      if (stringToDate.getTime() != NaN) {
        // ensure valid date
        date = new Date(req.body.date); //convert string to date
      }
    }
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
      await saveUser(user, function(err, result){
        if(err){
          console.log(err+"@line 322")
        }
        if (result){
          console.log(user+"saved at line 325"+result);
        }
      });
    } catch (err) {
      console.log(err);
    }

    try {
      await saveThisHasAllLogsForUser(exerciseModel, function(err, result){
        if(err){
          console.log(err+"@line 355")
        }
        if (result){
          console.log(exerciseModel+"saved at line 358");
        }
      });    //located at line 129
    } catch (err) {
      console.log(err);
      return "error saving to data base" + err;
    }

    return res.json({ username: req.body.username, _id: user.id });
  }
});

// Get api/exercise/users to get an array of all users
app.get("/api/exercise/users/", async function(req, res) {
  
 await getAllUsers(function(err, result) {    // defined at line 100
   if(err) console.log(err);
   return res.send(result);
  });
});

// this is where the exercise is logged
app.post("/api/exercise/add", async function(req, res) {
  var username;
  var results;
  var savedData = {}; // savedData will hold updated record from DB
  var { userId, description, duration, date } = req.body;
  if (+duration == NaN) {
    // use the Unary Opperator to covert type to Number
    return res.send("please enter proper duration in minutes ");
  } else duration = parseInt(duration);
  console.log("line 377 duration is type :" + typeof duration);
  if (!date || date == "") {
    date = new Date(); // if no date make now the new date
  }
  date = date.toString();
    
  let newLog = {
    //update to match format
    id: userId,
    description: req.body.description,
    duration: parseFloat(req.body.duration),
    date: date
  };

  await saveExercise(newLog, async function(err,result){      //defined at line 205
    if(err) console.log(err);
    else{
     console.log("success at 404 "+result.toString());    // result of save not needed
     results=result;
    }
  });      //saveExercise @ line 129
  
      //console.log("line 343 " +results);
    
                
    try {
      console.log("Saved log for "+ userId + " @ line 389");
    } catch (err) {
      console.log(err);
    }
  
 await getUserName(userId, (err, data)=>{    //defined at line 148
   if(err){
     console.log("line 396 Error "+err);
   }
   else{
     console.log(" line 399 name..."+data); 
     username=data;
   }
   console.log("Line 402 username is "+username);
 });


  console.log("username ="+username+"our result =" + JSON.stringify(results));
  res.json({"_id":userId, "username":username, "log":newLog});
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
  
  //let exerciseArray = []; // this will hold our exercise documents
  let { userId, from, to, limit } = req.query; // load userName in URL query ?userN=tara
  //let userId=_id;            // for use later
  var allDocuments;
  let logCount = 0;
  if (userId==null) {
    console.log("445 userId is null");
  //}
    await getUserLog(userId, async function(err,docs) {    // defined at line 151
      if(err) return res.send('error getting documents');
      else{
        if (docs==null){
          console.log("warning - docs=null");
        }
        allDocuments=docs;
        exerciseArray=docs;
        console.log("453 docs are found "); //+JSON.stringify(exerciseArray));
        
        //return res.json({ docs}); // if no id, display all logs) 
      }
    });
  }
  else{ //if (userId) {
    console.log("look up userId ="+userId);
    await getUserLog(userId, async function(err, logs){  //defined at line  152
      if(err) return res.send('error getting documents');
      else{
          exerciseArray=logs;
          console.log("line 466 "+logs)    
        }
      });
    console.log("Line 457"+exerciseArray+
      userId +
        " request  logs for: " +
        userId +" from "+
        from +" to "+
        to +" limit # "+
        limit
    );
//console.log("line 468 looking for logs for userId:" + userId);
//     await getUserLog(userId, async function(err, log){      //defined at line 150    
      
//       if(err) res.send(err+"error finding logs")  
//       if (log) {
//           console.log("log found"+JSON.stringify(log));
//           //ourUserName = docs.username; //pull userName from DB
//           exerciseArray = log;
//           console.log("line 482 logs are " +exerciseArray+ JSON.stringify(exerciseArray));
//           //return res.send(log);
//         }
//     });
      } // closes if(id)
    if (!to && !from && !limit) {
    //if (exerciseArray != "") {
      // if no parameters set, return all docs for user
      console.log("line 540 sending exerciseArray");
      res.json({
        exerciseArray
      });
    //}else{
     // res.send("no dice exerciseArray is empty"+exerciseArray);
    
  }

  // first extract raw data into final array
  finalDocArray = exerciseArray;
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
      finalDocArray = exerciseArray[0];
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
      finalDocArray.splice(limit);
    }
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