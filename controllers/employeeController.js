const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const paginate = require("express-paginate");
const Moment = require("moment");
const Employee = require("../models").Employee;
const Organization = require("../models").Organization;
const Designation = require("../models").Designation;
const upload = require("../helpers/file-upload");
const db = require("../models/index")

exports.list = async (req, res, next) => {
  var filter = [];

  if (req.query.filtered != undefined) {
    req.query.filtered = JSON.stringify(req.query.filtered);

    var filtered = JSON.parse(req.query.filtered);
    for (var i = 0; i < filtered.length; i++) {
      filtered[i] = JSON.parse(filtered[i]);
    }
    filter = filtered.map(data => {
      if (data.param == "statusId") {
        return {
          [data.param]: {
            [Op.eq]: data.value
          }
        };
      } else {
        return {
          [data.param]: {
            [Op.iLike]: "%" + data.value + "%"
          }
        };
      }
    });
  }

  let whereCondition = {};
  if (filter.length > 0) {
    whereCondition = {
      [Op.and]: filter
    };
  }

  whereCondition.deletedAt = null

  if (req.query.hasOwnProperty("all")) {
    await Employee.findAll({
      where: whereCondition,
      include: [Designation, {
        model: Employee,
        as: "Employer"
      }],
      order: [
        ["id", "DESC"]
      ]
    }).then(results => {
      return res.send({
        employees: results,
        success: true,
        message: "Success",
      });
    }).catch(error => {
      return res.status(400).send({
        success: false,
        message: error.name,
        error
      });
    })
  }

  await Employee.findAndCountAll({
      limit: req.query.limit,
      offset: req.skip,
      where: whereCondition,
      include: [Designation, {
        model: Employee,
        as: "Employer"
      }],
      order: [
        ["id", "DESC"]
      ]
    })
    .then(results => {
      const itemCount = results.count;
      const pageCount = Math.ceil(results.count / req.query.limit);
      return res.send({
        employees: results.rows,
        success: true,
        message: "Success",
        pageCount,
        itemCount,
        pages: paginate.getArrayPages(req)(3, pageCount, req.query.page)
      });
    })
    .catch(error => {
      return res.status(400).send({
        success: false,
        message: error.name,
        error
      });
    })
    .catch(next);
};

exports.create = async (req, res, next) => {

  let transaction
  try {
    transaction = await db.sequelize.transaction().catch(e => {
      console.log(e)
      throw e
    });

    var employee = null

    let employeeParams = JSON.parse(req.body.employee)

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {

        switch (file.fieldname) {
          case "profileImage":
            employeeParams.profileImage = file.path.slice(7)
            break

          case "visaFile":
            employeeParams.visaFile = file.path.slice(7)
            break

          case "prFile":
            employeeParams.prFile = file.path.slice(7)
            break

          case "healthCardFile":
            employeeParams.healthCardFile = file.path.slice(7)
            break

          case "drivingLicenseFile":
            employeeParams.drivingLicenseFile = file.path.slice(7)
            break
        }
      })
    }

    employee = await Employee.create(employeeParams, {
      transaction
    }).catch(err => {
      console.log(err)
      throw err
    })

    await transaction.commit();
    return res.status(201).send({
      success: true,
      message: "Success",
      employee: employee
    })

  } catch (err) {
    // Rollback transaction only if the transaction object is defined
    console.log(err)
    if (transaction) await transaction.rollback();

    return res.status(400).send({
      success: false,
      message: "Failed",
      error: err
    })
  }
};

exports.getOne = async (req, res, next) => {
  const {
    id
  } = req.params;

  await Employee.findOne({
      where: {
        id: id,
        deletedAt: null
      }
    })
    .then(employee => {
      if (!employee) {
        return res.status(404).send({
          message: "record Not Found",
          success: false
        });
      }
      return res.status(200).send({
        employee,
        success: true,
        message: "Success"
      });
    })
    .catch(error =>
      res.status(400).send({
        error,
        success: true,
        message: "Success"
      })
    );
};

exports.update = async (req, res, next) => {
  const {
    id
  } = req.params;

  const model = await Employee.findOne({
    where: {
      id: id,
      deletedAt: null
    }
  }).catch(error => {
    console.log(error);
    return res.status(400).send({
      message: "record Not Found",
      success: false
    });
  });

  if (!model) {
    return res.status(404).send({
      message: "record Not Found",
      success: false
    });
  }

  let transaction = await db.sequelize.transaction().catch(e => {
    console.log(e)
    throw e
  });

  let employeeParams = JSON.parse(req.body.employee)

  if (req.files && req.files.length > 0) {
    req.files.forEach((file) => {
      console.log(file)
      switch (file.fieldname) {
        case "profileImage":
          employeeParams.profileImage = file.path.slice(7)
          break

        case "visaFile":
          employeeParams.visaFile = file.path.slice(7)
          break

        case "prFile":
          employeeParams.prFile = file.path.slice(7)
          break

        case "healthCardFile":
          employeeParams.healthCardFile = file.path.slice(7)
          break

        case "drivingLicenseFile":
          employeeParams.drivingLicenseFile = file.path.slice(7)
          break
      }
    })
  }

  console.log(employeeParams)

  await model.update(employeeParams, {
      transaction
    })
    .catch(e => {
      console.log(e)
      throw e.message
    })


  await transaction.commit();
  return res.status(201).send({
    success: true,
    message: "Success",
    employee: model
  })
};

exports.destroy = async (req, res, next) => {
  const {
    id
  } = req.params;

  const employee = await Employee.findOne({
    where: {
      id: id,
      deletedAt: null
    }
  }).catch(error => {
    return res.status(400).send({
      message: error,
      success: false,
      message: "Failed"
    });
  });

  if (!employee) {
    return res.status(404).send({
      message: "record Not Found",
      success: false
    });
  }

  await employee
    .update({
      deletedAt: Moment.now()
    })
    .then(() =>
      res.status(204).send({
        message: "Deleted",
        success: true
      })
    )
    .catch(error =>
      res.status(400).send({
        error,
        success: false,
        message: "Failed"
      })
    );
};