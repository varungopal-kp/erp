const {
  check,
  validationResult
} = require("express-validator/check")
const {
  sanitizeBody
} = require("express-validator/filter")
const Sequelize = require("sequelize")
const db = require("../models/index")
const bcrypt = require('bcrypt');
const Op = Sequelize.Op
const paginate = require("express-paginate")

const User = require("../models").User
const ErrorUtil = require("../util/Error")
const Branch = require("../models").Branch
const UserPrivilege = require("../models").UserPrivilege
const Module = require("../models").Module

exports.list = async (req, res, next) => {
  var filter = []

  if (req.query.filtered != undefined) {
    req.query.filtered = JSON.stringify(req.query.filtered)

    var filtered = JSON.parse(req.query.filtered)
    for (var i = 0; i < filtered.length; i++) {
      filtered[i] = JSON.parse(filtered[i])
    }
    filter = filtered.map(data => {
      if (data.param == "statusId") {
        return {
          [data.param]: {
            [Op.eq]: data.value
          }
        }
      } else {
        return {
          [data.param]: {
            [Op.iLike]: "%" + data.value + "%"
          }
        }
      }

    })
  }


  let whereCondition = {
    isSuperAdmin: {
      [Op.eq]: false
    }
  }
  if (filter.length > 0) {
    whereCondition = {
      [Op.and]: filter,
      isSuperAdmin: {
        [Op.eq]: false
      }
    }
  }

  await User.findAndCountAll({
      // attributes: [
      //   'id', 'email', 'username', 'branchId', 'branch.organizationId', 'employeeId', 'statusId'
      // ],
      include: [{
          model: Branch,
          as: "branch",
        },
        {
          model: UserPrivilege
        },
      ],
      distinct: true,
      limit: req.query.limit,
      offset: req.skip,
      where: whereCondition,
      // order: [
      //   ['createdAt', 'DESC']
      // ],
    })
    .then(results => {
      const itemCount = results.count
      const pageCount = Math.ceil(results.count / req.query.limit)

      return res.status(200).send({
        success: true,
        message: "success",
        users: results.rows,
        pageCount,
        itemCount,
        pages: paginate.getArrayPages(req)(3, pageCount, req.query.page),
      })
    })
    .catch(error => {
      return res.status(400).send({
        success: false,
        message: "failed",
        error
      })
    })
    .catch(next)
}

exports.create = async (req, res, next) => {
  let {
    user
  } = req.body

  if (!user) {
    return res.status(400).send({
      success: false,
      message: "Missing input data",
    })
  }

  let transaction

  try {
    transaction = await db.sequelize.transaction().catch(e => {
      console.log(e)
      throw e
    });

    let inputParam = {
      email: user.email,
      password: bcrypt.hashSync(user.password, 10),
      username: user.username,
      branchId: user.branchId,
      employeeId: user.employeeId,
    }

    //Check if the email has been registered
    const existingEmail = await User.findOne({
      where: {
        email: user.email
      }
    }).catch(e => {
      console.log(e)
      throw e
    })

    const existingUsername = await User.findOne({
      where: {
        username: user.username
      }
    }).catch(e => {
      console.log(e)
      throw e
    })

    if (existingEmail) {
      return res.status(400).send({
        success: false,
        message: "Email is already been Registered. Try with a new one",
      })
    }

    if (existingUsername) {
      return res.status(400).send({
        success: false,
        message: "Username is already been Registered. Try with a new one",
      })
    }

    if (!existingEmail && !existingUsername) {
      let newUser = await User.create(inputParam, {
        transaction
      }).catch(e => {
        console.log(e)
        throw e
      })

      if (newUser && newUser.id && user.UserPrivileges) {
        await saveUserPrivileges(user.UserPrivileges, newUser.id, transaction)

        // commit
        await transaction.commit();

        return res.status(200).send({
          success: true,
          message: "Success",
          user: newUser
        })
      }
    }
  } catch (error) {
    // Rollback transaction only if the transaction object is defined
    console.log(error)
    if (transaction) await transaction.rollback();

    return res.status(400).send({
      success: false,
      message: "Failed",
      error: error.message
    })
  }
}

const saveUserPrivileges = async (privileges, userId, transaction) => {

  const existingPrivileges = await UserPrivilege.findAll({
    where: {
      userId: userId
    }
  }).catch(error => {
    console.log(error)
    throw error
  })

  const moduleIds = privileges.map(x => x.moduleId)
  const privilegesToDelete = existingPrivileges.filter(x => !moduleIds.includes(x.moduleId))

  console.log("moduleIds", moduleIds)
  console.log("privilegesToDelete", privilegesToDelete)

  // Update the items which is removed by user
  for (privilege of privilegesToDelete) {
    await privilege.update({
      read: false,
      write: false,
      delete: false,
    }, {
      transaction
    }).catch(error => {
      console.log(error)
      throw error
    })
  }

  for (let i = 0; i < privileges.length; i++) {
    var item = privileges[i]

    const existingPrivilege = await UserPrivilege.findOne({
      where: {
        moduleId: item.moduleId,
        userId: userId
      },
    }).catch(err => {
      console.log(err)
      throw err
    })

    var inputParam = {
      moduleId: item.moduleId,
      userId: userId,
      read: (item.read) ? item.read : false,
      write: (item.write) ? item.write : false,
      delete: (item.delete) ? item.delete : false,
    }

    if (!existingPrivilege) {
      await UserPrivilege.create(inputParam, {
          transaction: transaction
        })
        .catch(err => {
          console.log(err)
          throw err
        })
    } else {
      await existingPrivilege.update(inputParam, {
          transaction: transaction
        })
        .catch(err => {
          console.log(err)
          throw err
        })
    }
  }
}

exports.getOne = async (req, res, next) => {
  const {
    id
  } = req.params

  await User.findOne({
      where: {
        id: {
          [Op.eq]: id
        },
        isSuperAdmin: {
          [Op.eq]: false
        }
      },
      // attributes: [
      //   'id', 'email', 'username', 'branchId', 'branch.organizationId', 'employeeId', 'statusId'
      // ],
      include: [{
          model: Branch,
          as: "branch",
        },
        {
          model: UserPrivilege
        },
      ],
    })
    .then(user => {
      if (!user) {
        return res.status(404).send({
          success: false,
          message: "record Not Found",
        })
      }
      return res.status(200).send({
        user,
        success: true,
        message: "Success",
      })
    })
    .catch(error => res.status(400).send({
      error
    }))
}

exports.update = async (req, res, next) => {
  let transaction

  try {
    const {
      id
    } = req.params
    const {
      user
    } = req.body

    var param = {
      email: user.email,
      username: user.username,
      employeeId: user.employeeId,
      branchId: user.branchId,
    }

    if (user.password) {
      param.password = bcrypt.hashSync(user.password, 10)
    }

    const userObj = await User.findOne({
      where: {
        id: {
          [Op.eq]: id
        }
      },
    }).catch(error => {
      return res.status(400).send({
        success: false,
        message: "record Not Found",
      })
    })

    if (!userObj) {
      return res.status(404).send({
        success: false,
        message: "record Not Found",
      })
    }

    //Check if the email has been registered
    let takenEmail = await User.findOne({
      where: {
        id: {
          [Op.ne]: id
        },
        email: {
          [Op.eq]: user.email
        },
      },
    }).catch(e => {
      console.log(e)
      throw e
    })

    let takenUsername = await User.findOne({
      where: {
        id: {
          [Op.ne]: id
        },
        email: {
          [Op.eq]: user.username
        },
      },
    }).catch(e => {
      console.log(e)
      throw e
    })

    if (takenEmail) {
      return res.status(400).send({
        message: "Email address is already been Registered. Try with a new one",
        success: false,
      })
    }

    if (takenUsername) {
      return res.status(400).send({
        message: "Username is already been Registered. Try with a new one",
        success: false,
      })
    }

    transaction = await db.sequelize.transaction().catch(e => {
      console.log(e)
      throw e
    });

    if (!takenEmail && !takenUsername) {
      userObj.update(param, {
        transaction
      }).catch(e => {
        console.log(e)
        throw e
      })

      await saveUserPrivileges(user.UserPrivileges, userObj.id, transaction)

      // commit
      await transaction.commit();

      return res.status(200).send({
        success: true,
        message: "Success",
        user: userObj
      })
    }
  } catch (error) {
    // Rollback transaction only if the transaction object is defined
    console.log(error)
    if (transaction) await transaction.rollback();

    return res.status(400).send({
      success: false,
      message: "Failed",
      error: error.message
    })
  }

}

exports.destroy = async (req, res, next) => {
  let transaction = await db.sequelize.transaction().catch(e => {
    console.log(e)
    throw e
  });

  try {
    const {
      id
    } = req.params

    const user = await User.findOne({
      where: {
        id: {
          [Op.eq]: id
        }
      },
    }).catch(error => {
      throw error
    })

    if (!user) {
      throw "record Not Found"
    }

    await UserPrivilege.destroy({
      where: {
        userId: id
      },
      transaction
    }).catch(error => {
      throw error
    })

    await user.destroy({
      transaction
    }).catch(error => {
      throw error
    })

    // commit
    await transaction.commit();

    return res.status(200).send({
      success: true,
      message: "Deleted Successfully.",
    })

  } catch (error) {
    // Rollback transaction only if the transaction object is defined
    if (transaction) await transaction.rollback();
    console.log(error)
    return res.status(400).send({
      message: error.message,
      success: false
    });
  }

}

exports.validate = method => {
  switch (method) {
    case "create": {
      return [
        sanitizeBody("user.*")
        .trim()
        .escape(),
        check("user").exists(),

      ]
    }
    case "list": {
      return []
    }
  }
}

exports.getUserPrivileges = async (req, res, next) => {
  const {
    id
  } = req.params

  if (!id)
    return res.status(401).send({
      success: false,
      message: "User parameter missing.",
    })

  await UserPrivilege.findAll({
      include: [{
        model: Module
      }],
      order: [
        ['id', 'ASC'],
      ],
      where: {
        userId: id
      }
    })
    .then(userPrivileges => res.status(200).send({
      userPrivileges
    }))
    .catch(error => res.status(400).send({
      error
    }))
}

const validationHandler = (req, res) => {
  // Finds the validation errors in this request and wraps them in an object with handy functions
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({
      errors: errors.array()
    })
  }
}