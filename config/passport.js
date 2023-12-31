const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require("../models").User
const cred = require('../config/database');


module.exports = function (passport) {
  let opts = {};
  opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
  opts.secretOrKey = cred.secret;
  passport.use(new JwtStrategy(opts, (jwt_payload, done) => {

    User.findById(jwt_payload.data.id).then(user => {
    //   if (err) {
    //     return done(err, false);
    //   }
      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    }).catch(err=>{
        if (err) {
            return done(err, false);
        }
    });
  }));

}