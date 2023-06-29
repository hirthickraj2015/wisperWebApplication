//jshint esversion:6
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import ejs from 'ejs';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import session from 'express-session';
import passport from 'passport';
import passportLocalMongoose from 'passport-local-mongoose';

const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

const uri = "mongodb://127.0.0.1/userDB";
app.use(session({
    secret: "You cant find me.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

main().catch((err) => console.log(err));
async function main() {
  await mongoose.connect(uri,{ useNewUrlParser: true, useUnifiedTopology: true });
}

const userSchema =new mongoose.Schema({
    email: String,
    password: String,
    secret: String
});


userSchema.plugin(passportLocalMongoose);

const User= mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/secrets', (req, res) => {
    User.find({"secret":{$ne:null}})
    .then(function (foundUsers) {
      res.render("secrets",{usersWithSecrets:foundUsers});
      })
    .catch(function (err) {
      console.log(err);
      })
});

app.get('/logout', (req, res) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect('/');
        console.log('USER NOW LOGGED OUT');
    });
});

app.get('/submit', (req, res) => {
    if(req.isAuthenticated()){
        res.render('submit');
    }else{
        res.redirect('/login');
    }
});


app.post('/submit', (req, res) => {
    console.log(req.user);
    User.findById(req.user)
      .then(foundUser => {
        if (foundUser) {
          foundUser.secret = req.body.secret;
          return foundUser.save();
        }
        return null;
      })
      .then(() => {
        res.redirect("/secrets");
      })
      .catch(err => {
        console.log(err);
      });
});

app.post('/register', (req, res) => {

    new Promise((resolve, reject) => {
        User.register({ username: req.body.username }, req.body.password, (err, user) => {
            if (err) {
                console.log(err);
                reject(err);
            } else {
                resolve(user);
            }
        });
    })
    .then(user => {
        return new Promise((resolve, reject) => {
            req.login(user, err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    })
    .then(() => {
        res.redirect('/secrets');
    })
    .catch(err => {
        console.log(err);
        res.redirect('/register');
    });
;
});


app.post('/login', (req, res) => {
    
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    console.log('[ ' + req.body.username + ' ]' + ' is currently logged in');

    req.login(user, function (err) {
    if (err) {
        next(err);
    } else {
        passport.authenticate('local')(req, res, function () {
        res.redirect('/secrets');
        });
    }
    });

});








app.listen(3000, function(){
    console.log('listening on port 3000');
})