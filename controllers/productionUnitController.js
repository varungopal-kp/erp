const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const paginate = require("express-paginate");
const ProductionUnit = require("../models").ProductionUnit;
const Branch = require("../models").Branch;
const Warehouse = require("../models").Warehouse;

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

  await ProductionUnit.findAndCountAll({
      limit: req.query.limit,
      offset: req.skip,
      where: whereCondition,
      include: [Branch, Warehouse],
      order: [
        ["createdAt", "DESC"]
      ]
    })
    .then(results => {
      const itemCount = results.count;
      const pageCount = Math.ceil(results.count / req.query.limit);
      return res.send({
        productionUnits: results.rows,
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
  let {
    productionUnit
  } = req.body;

  await ProductionUnit.create(productionUnit)
    .then(result => {
      return res.status(201).send({
        productionUnit: result,
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

  await ProductionUnit.findOne({
      where: {
        id: {
          [Op.eq]: id
        }
      },
      include: [Branch, Warehouse],
    })
    .then(productionUnit => {
      if (!productionUnit) {
        return res.status(404).send({
          message: "record Not Found",
          success: false
        });
      }
      return res.status(200).send({
        productionUnit,
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
    productionUnit
  } = req.body;

  const productionUnitObj = await ProductionUnit.findOne({
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

  if (!productionUnitObj) {
    return res.status(404).send({
      message: "record Not Found",
      success: false
    });
  }

  productionUnitObj
    .update(productionUnit)
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

  const productionUnit = await ProductionUnit.findOne({
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

  if (!productionUnit) {
    return res.status(404).send({
      message: "record Not Found",
      success: false
    });
  }

  await productionUnit
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