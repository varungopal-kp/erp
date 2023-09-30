const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const paginate = require("express-paginate");
const WorkCenter = require("../models").WorkCenter;
const WorkCenterGroup = require("../models").WorkCenterGroup;
const ProductionUnit = require("../models").ProductionUnit;
const UOM = require("../models").UOM;

exports.list = async (req, res, next) => {
  var filter = [];
  var include = [{
      model: WorkCenter,
      as: "AlternativeWorkCenter"
    },
    {
      model: WorkCenterGroup,
    },
    {
      model: ProductionUnit
    },
    {
      model: UOM
    }
  ]

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

    await WorkCenter.findAndCountAll({
        include: include,
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
          workCenters: results.rows,
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
      workCenters: await WorkCenter.findAll({
        include: include,
      })
    });
  }
};

exports.create = async (req, res, next) => {
  let {
    workCenter
  } = req.body;

  await WorkCenter.create(workCenter)
    .then(result => {
      return res.status(201).send({
        workCenter: result,
        success: true,
        message: "Success"
      });
    })
    .catch(error => {
      return res.status(400).send({
        error,
        success: false,
        message: error.name
      });
    });
};

exports.getOne = async (req, res, next) => {
  const {
    id
  } = req.params;

  await WorkCenter.findOne({
      where: {
        id: {
          [Op.eq]: id
        }
      }
    })
    .then(workCenter => {
      if (!workCenter) {
        return res.status(404).send({
          message: "record Not Found",
          success: false
        });
      }
      return res.status(200).send({
        workCenter,
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
    workCenter
  } = req.body;

  const workCenterObj = await WorkCenter.findOne({
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

  if (!workCenterObj) {
    return res.status(404).send({
      message: "record Not Found",
      success: false
    });
  }

  workCenterObj
    .update(workCenter)
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

  const workCenter = await WorkCenter.findOne({
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

  if (!workCenter) {
    return res.status(404).send({
      message: "record Not Found",
      success: false
    });
  }

  await workCenter
    .destroy()
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
exports.workCenterGrouplist = async (req, res, next) => {
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

    await WorkCenterGroup.findAndCountAll({
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
          workCenterGroups: results.rows,
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
      workCenterGroups: await WorkCenterGroup.findAll()
    });
  }
};