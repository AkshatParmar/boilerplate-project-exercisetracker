const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var mongodb = require('mongodb');

// JSON Parser
var jsonParser = bodyParser.json();
// x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({
  extended: false
});

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Connect to DB
mongoose.connect(process.env.MONGO_URI,{ 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
});

// Define Schemas
const { Schema } = mongoose;

var userSchema = new Schema({
  username: String,
});

var exerciseSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String,
});

// var logSchema = new Schema({
//   username: String,
//   count: Number,
//   log: [{
//     description: String,
//     duration: Number,
//     date: String
//   }]
// });

// Define Models
var User = mongoose.model('User', userSchema);
var Exercise = mongoose.model('Exercise', exerciseSchema);
// var Log = mongoose.model('Log', logSchema);

// Creating doc instance
var createAndSaveUser = (name, done) => {
  var example = new User({
    username: name
  });
  example.save(function(err, data){
    if (err) return console.log(err);
    // console.log(data);
    done(null, data);
  })
};

var createAndSaveExercise = (id, date, description, duration, done) => {
  const user = "";
  User.find({ _id: id}, function(err, data) {
    if (err) return console.log(err);
    console.log("Found", data);
    user = data['username'];
  });

  if (!date || date == "") {
    date = new Date();
  };

  var example = new Exercise({
    username: user,
    description: description,
    duration: duration,
    date: date
  });

  example.save(function(err, data){
    if (err) return console.log(err);
    console.log(data);
    done(null, data);
  })
};

// Add a new User
app.post('/api/users', urlencodedParser, function(req, res) {
  const username = req.body.username;
  createAndSaveUser(username, function(err, data) {
    if (err) return console.log(err);
    res.status(201).json({
      username: username,
      _id: data['_id']
    });
  });
});

// Get All Users
app.get('/api/users', function(req, res) {
  User.find({}, function(err, users) {
    if (err) return console.log(err);
    res.status(200).json(users);
  });
});

// Add an exercise
app.post('/api/users/:_id/exercises', urlencodedParser, function(req, res, next) {
  const user_id = req.params._id;
  const desc = req.body.description;
  const dur = req.body.duration;
  let datum = req.body.date;
  // datum = (datum === "" || typeof datum === "undefined") ? new Date().toDateString() : new Date(datum).toDateString();
  datum = (datum === "" || typeof datum === "undefined") ? new Date() : new Date(datum);
  var usaname = "";

  User.findOne({ _id: user_id }, function(err, user_found) {
    if (err) return console.log(err);
    
    if (user_found) {
      // usaname = user_found[0]['username'];
      var workout = new Exercise({
        user: user_found,
        description: desc,
        duration: dur,
        date: datum
      });

      workout.save(function(err, newExercise) {
        if (err) return console.log(err);
        console.log(newExercise);
        res.status(201).json({
          _id: newExercise.user._id,
          username: newExercise.user.username,
          description: newExercise.description,
          duration: newExercise.duration,
          date: newExercise.date
        });
      });  
    } else {
      return next({ message: "User not found" });
    };
  });
});

// Get logs
app.get('/api/users/:_id/logs', function(req, res, next) {
  
  // Check Query
  let { userId, from, to, limit } = req.query;
  userId = req.params._id;
  from = new Date(from) == "Invalid Date" ? 0 : new Date(from);
  to = new Date(to) == "Invalid Date" ? 0 : new Date(to);
  limit = isNaN(parseInt(limit)) ? 0 : parseInt(limit);

  console.log(from,"to", to)
  // Fetch User
  User.findOne({ _id: userId }, function(err, user_found) {
    if (err) return console.log(err);

    if (user_found) {

      if (Object.keys(req.query).length != 0) {
        Exercise
        .find({ user: user_found._id })
        .select('description duration date -_id')
        .where('date').gte(from).lte(to)
        .limit(limit)
        .exec(function(err, foundExcercies) {
          if (err) return console.log(err);

          if (foundExcercies) {
            let log = foundExcercies.map(el => ({
              description: el.description,
              duration: el.duration,
              date: el.date
            }));
            // console.log(log.filter(d => new Date(d.date) > from && new Date(d.date) < to))            
            let return_obj = {
              _id: user_found._id,
              username: user_found.username,
              count: log.length,
              log: log
            };
            res.status(200).json(return_obj);
          } else {
            next({message: 'No exercies found'});
          };
        });

      } else {
        Exercise
        .find({ user: user_found._id })
        .select('description duration date -_id')
        .exec(function(err, foundExcercies) {
          if (err) return console.log(err);
          
          if (foundExcercies) {
            let log = foundExcercies.map(el => ({
              description: el.description,
              duration: el.duration,
              date: el.date
            }));
            let return_obj = {
              _id: user_found._id,
              username: user_found.username,
              count: log.length,
              log: log
            };
            res.status(200).json(return_obj);
            } else {
              next({message: 'No exercies found'});
          };
        });
      };
    } else {
      res.status(401).json({ message:"No user found"});
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
