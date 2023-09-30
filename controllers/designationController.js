const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const paginate = require("express-paginate");
const Designation = require("../models").Designation;
const helper = require("../helpers/helper")

exports.list = async (req, res, next) => {
  var filter = [];
  if (!req.query.hasOwnProperty("all")) {
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

    await Designation.findAndCountAll({
        limit: req.query.limit,
        offset: req.skip,
        where: whereCondition,
        order: [
          ["createdAt", "DESC"]
        ]
      })
      .then(results => {
        const itemCount = results.count;
        const pageCount = Math.ceil(results.count / req.query.limit);
        return res.send({
          designations: results.rows,
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
  } else {
    return res.send({
      designations: await Designation.findAll()
    });
  }
};

exports.create = async (req, res, next) => {
  let {
    designation
  } = req.body;

  await Designation.create(designation)
    .then(result => {
      return res.status(201).send({
        designation: result,
        success: true,
        message: "Success"
      });
    })
    .catch(async error => {
      return res.status(400).send({
        error,
        success: false,
        message: await helper.getErrorMessage(error, "Insertion Failed!")
      });
    });
};

exports.getOne = async (req, res, next) => {
  const {
    id
  } = req.params;

  await Designation.findOne({
      where: {
        id: {
          [Op.eq]: id
        }
      }
    })
    .then(designation => {
      if (!designation) {
        return res.status(404).send({
          message: "record Not Found",
          success: false
        });
      }
      return res.status(200).send({
        designation,
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
  const {
    designation
  } = req.body;

  const model = await Designation.findOne({
    where: {
      id: {
        [Op.eq]: id
      }
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

  model
    .update(designation)
    .then(result =>
      res.status(200).send({
        result,
        success: true,
        message: "Success"
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

exports.destroy = async (req, res, next) => {
  const {
    id
  } = req.params;

  const designation = await Designation.findOne({
    where: {
      id: {
        [Op.eq]: id
      }
    }
  }).catch(error => {
    return res.status(400).send({
      message: error,
      success: false,
      message: "Failed"
    });
  });

  if (!designation) {
    return res.status(404).send({
      message: "record Not Found",
      success: false
    });
  }

  await designation
    .destroy()
    .then(() =>
      res.status(204).send({
        message: "Deleted",
        success: true
      })
    )
    .catch(async error => {
      const message = await helper.getErrorMessage(error, "Deletion Failed!")

      res.status(400).send({
        error,
        success: false,
        message
      })
    });
};