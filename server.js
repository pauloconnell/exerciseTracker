const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const shortid=require("shortid");
let ourUserArray = []; // this will hold our users from DB
let exerciseArray = []; // this will hold our info for 'this' user
var finalDocArray = [];





mongoose.connect(process.env.DB_URI, {useNewUrlParser: true, useCreateIndex: true}); // if using node.js- || 'mongodb://localhost/exercise-track' )
// Make Mongoose use `findOneAndUpdate()`. Note that this option is `true`
// by default, you need to set it to false.
mongoose.set('useFindAndModify', false);
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//define our schemas and collections/models:
const userSchema = new mongoose.Schema(
  {
    _id:{ type: mongoose.Schema.ObjectId, auto: true },
    username: String 
  });
const UserModel = mongoose.model("UserCollection", userSchema);
const exerciseSchema= new mongoose.Schema(
      {
        username: String,
        _id: String,         
        count: Number,
        log: []
      });
const ExerciseModel = mongoose.model("ExerciseCollection2", exerciseSchema);
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


// recieves submit data for user name- db will return _id to use for logging exercises
app.post("/api/exercise/new-user", async function(req, res) {
  const { username } = req.body; //destructure POST variables
  let log=[];                    // log will store exercise logs in the array of each user
  let existingUser = false;     // unless we find one
  if (username) {
    await UserModel
      .findOne({ username: username }) //find existing, else it's new user })
      .exec()
      .then(docs => {
        if (docs) {
          existingUser = true;
          console.log("Existing user " + docs.username + "FOUND " + docs._id);
          return res.json(docs);
        }
      })
      .catch(err => {
        console.log(err);
        res.send(err + "Couldn't access database to check for user ID");
      });
  }
  console.log("about to look up user " + username);
  console.log("connection State:" + mongoose.connection.readyState);

  //save new user's profile
  if (!existingUser) {
    let date = new Date(); // if no date given, use this date
    if (req.body.date) {
      date = new Date(req.body.date);  //else convert string to date
    }
    console.log("Schema creation at line 100");
    //Object ID creation options:   
    //var _id= new mongoose.Types.ObjectId();  //creates our _id
    //left out because _id auto generated
    
    var user = new UserModel({
      _id:shortid.generate(),    //Auto Generate to avoid type conversions
      username: username      
    });
   
    
    //    create the exercise file in the database to update with exercises
    
    let exerciseModel= new ExerciseModel({
        userName: username,
        _id:user._id,                 
        count:0,    
        log:[]
    });
    
    // Save our model and exercise logs to DB
    
     await user.save(err => {
      if (err) {
        return "error saving to data base" + err;
      } else{
        //res.json(tracker.userName, tracker._id);
  
        //res.send(user);    // will include auto generated _id
      }
    });
    
     await exerciseModel.save((err, doc) => {
      if (err) {
        return "error saving to data base" + err;
      } else{
        //res.json(tracker.userName, tracker._id);
        //console.log(newLog);
        //return;// res.json(doc);
      }
    });
    res.json({username:req.body.username, _id:user._id})    
  }
});


// Get api/exercise/users to get an array of all users
app.get("/api/exercise/users/", async function(req, res){
  let userList= await UserModel.find({});
  return res.json(userList);
});

//delete below - kept incase we need to use later-all records were kept seperate, now in array in single user document
app.get("/api/exercise/oldWayToFindusers/", async function(req, res) {
  let arrayOfUserDocs = [];
  let arrayOfUsers = [];
  await UserModel
    .find()
    .exec()
    .then(async docs => {
      arrayOfUserDocs.push(docs);            // load doc into []
      arrayOfUserDocs = arrayOfUserDocs[0]; // array is pushed in location[0] could have used(...docs)right?
      arrayOfUserDocs.forEach(user => {
        //for(var i=0; i<arrayOfUserDocs.length; i++){
        var thisUser = user.username;      // cycle through [] get users
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
  var username;
  let { userId, description, duration, date } = req.body;
  if(+duration == NaN){   // use the Unary Opperator to covert type to Number
    return res.send("please enter proper duration in minutes ");
  }
  else duration=parseInt(duration);
  console.log("line 188 duration is type :"+typeof(duration));
  if (!date||date=="") {
    date = new Date();  // if no date make now the new date
  }
  date=date.toString();
 // if (Object.prototype.toString.call(date) === "[object Date]") {
  // it is a date
  //if (isNaN(date.getTime())) {  // d.valueOf() could also work
    // date is not valid
  //} else {
    // date is valid
  //}
//} else {
  // not a date
//}
  //check if userId is valid
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    res.send(
      userId +
        "please enter valid userId, use create new user to look up your userId"
    );
  }
  // get username from userId  
  //  NOT REQUIRED BECAUSE ID IS NOW ON THE EXERCISEMODEL
//   await UserModel.findById(userId)
//     .exec()
//     .then( async doc=>{
//       if(doc){
//         console.log("username found: "+doc)
//       username=doc.username;
//      //  res.send(doc);
//       }
//     else
//       res.send("no docs at 215 id ="+userId);
//     })
//     .catch(err=> console.log("error occured @217 while accessing DB looking up "+userId+" copy your userId again and retry"));
  
  //add data verification here - but not required
 
  let newLog={ description:req.body.description,
      duration:parseFloat(req.body.duration),
      date: date
      };
  
   ExerciseModel
     .findByIdAndUpdate(    //  using an embedded array and 1 main document
       { _id: userId },
       {
         $push: {
           log: newLog
         },
         $inc: {
           count: 1
         }
        },{'new': true, lean:true})
     .then( function(err, result) {
       if (err) {
         res.send(err);
       } else {
         res.send(result);
       }
     }
     );
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
  let ourUserName = "";
  let exerciseArray = [];    // this will hold our exercise documents
  let { userId, from, to, limit } = req.query; // load userName in URL query ?userN=tara
  //let _id=userId;            // for use later 
  let logCount = 0;
  if (!userId) {
    await ExerciseModel
      .find()
      .exec()
      .then(docs => {
        return res.send({ docs }); // if no id, display all logs
      })                                                        // may need to store and trim (to from limit)
      .catch(err => {
        res.send(err);
      });
  }
  console.log(userId + from + to + limit);
  if (userId) {
    // if _id exists ensure it is valid
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.send(
        userId +
          "please enter valid userId, use create new user to look up your userId"
      );
    }
    console.log(
      req.query.userId +
        " passed ObjectId check - recieved request for logs for: " +
        userId +
        from +
        to +
        limit
    );

    // get userName from Db as all logs stored under user name
    // ie. each log get's it's own unique _id, so it's sorted by username
    await ExerciseModel
      .findById(userId)
      .exec()
      .then(async docs => {
        console.log("looking  for userName and logs for userId:" + userId);
        if (docs) {
          console.log("docs found");
          ourUserName = docs.username; //pull userName from DB
          console.log("Docs are stored under user  " + ourUserName);
          exerciseArray=docs;
          //return res.json(docs);
        } else res.send("No files for user " + userId);
      })
      .catch(err => {
        res.send(err);
      });
  } // closes if(id)
  // if (ourUserName) {
  //   // if we got it from DB find logs under that name
  //   await ExerciseModel
  //     .find({
  //       username: ourUserName
  //     })
  //     .exec()
  //     .then(docs => {
  //       ourDocsArray = docs; // loads up our data into []
  //       logCount = docs[0].count
  //     });
  // }
  if (!to && !from && !limit) {
    if (exerciseArray !="") {
      // if no parameters set, return all docs for user
      res.json({
         exerciseArray,
      });
    }
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
      finalDocArray.length = limit;
    }
  }
 });

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
