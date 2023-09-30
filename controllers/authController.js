const User = require("../models").User
const Branch = require("../models").Branch
const UserPrivilege = require("../models").UserPrivilege
const Module = require("../models").Module

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// const cred = require('../config/database.json');
module.exports = {

  async auth(req, res) {
    const email = req.body.email;
    const password = req.body.password;

    const user = await User.findOne({
      include: [{
        model: Branch,
        as: "branch",
      }],
      where: {
        email: email
      },
    })

    if (!user) {
      return res.status(401).send({
        success: false,
        error: 'Email is wrong !!!',
        message: 'Email is wrong !!!',
      })
    }

    if (bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({
          data: user
        },
        process.env.JWT_KEY, {
          expiresIn: 604800 //1 week
        },
      );

      // Get user privileges
      const userPrivileges = await UserPrivilege.findAll({
        attributes: ['moduleId', 'read', 'write' ,'delete'],
        include: [{
          model: Module,
          attributes: ['name', 'slug']
        }],
        order: [
          ['id', 'ASC'],
        ],
        where: {
          userId: user.id
        }
      })

      res.json({
        success: true,
        message: 'Successfully Logged In. ',
        // token: 'JWT ' + token,
        token: token,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          branchId: user.branchId,
          isSuperAdmin: user.isSuperAdmin,
          organizationId: user.branch.organizationId,
          userPrivileges: userPrivileges
        }
      });
    } else {
      return res.status(401).send({
        success: false,
        error: 'Password is wrong !!!',
        message: 'Password is wrong !!!',
      })
    }
  },

  async register(req, res) {

    let newUser = new User({
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 10),
      username: req.body.username,
      branchId: req.body.branchId
    });

    //To check if the email has been registered
    User.findOne({
      where: {
        email: req.body.email
      }
    }).then(user => {

      if (user == null) {
        newUser.save().then(user => {

          res.json({
            success: true,
            message: 'Successfully User Registered '
          });

        }).catch(err => {
          res.json({
            success: false,
            message: 'FAILED to Register  the User',
            err: err
          });
        });
      } else {
        res.json({
          success: false,
          message: 'Email address is already been Registered. Try with a new one'
        });
      }
    });
  },
}