const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const paginate = require("express-paginate");
const MachineCenter = require("../models").MachineCenter;
const WorkCenter = require("../models").WorkCenter;
const ProductionType = require("../models").ProductionType;
const UOM = require("../models").UOM;
const MachineWeekDays = require("../models").MachineWeekDays;
const MachineRoutingStages = require("../models").MachineRoutingStages;
const RoutingStages = require("../models").RoutingStages;
const WeekDays = require("../models").WeekDays;
const db = require("../models/index")

exports.list = async (req, res, next) => {
  var filter = [];
  var include = [{
      model: WorkCenter,
    },
    {
      model: ProductionType,
    },
    {
      model: UOM,
    },
    {
      model: MachineWeekDays,
      include: {
        model: WeekDays
      }
    },
    {
      model: MachineRoutingStages,
      include: {
        model: RoutingStages
      }
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

    await MachineCenter.findAndCountAll({
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
          machineCenters: results.rows,
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
      machineCenters: await MachineCenter.findAll({
        include: include
      })
    });
  }
};

exports.create = async (req, res, next) => {
  let {
    machineCenter
  } = req.body;

  var include = [{
      model: MachineWeekDays,
      required: true
    },
    {
      model: MachineRoutingStages,
      required: true
    }
  ]

  await MachineCenter.create(machineCenter, {
      include: include
    })
    .then(result => {
      return res.status(201).send({
        machineCenter: result,
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

  await MachineCenter.findOne({
      include: [{
          model: MachineWeekDays,
          include: {
            model: WeekDays
          }
        },
        {
          model: MachineRoutingStages,
          include: {
            model: RoutingStages
          }
        }
      ],
      where: {
        id: {
          [Op.eq]: id
        }
      }
    })
    .then(machineCenter => {
      if (!machineCenter) {
        return res.status(404).send({
          message: "record Not Found",
          success: false
        });
      }
      return res.status(200).send({
        machineCenter,
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
  let transaction = await db.sequelize.transaction().catch(e => {
    console.log(e)
    throw e
  });

  try {
    const {
      id
    } = req.params;

    const {
      machineCenter
    } = req.body;

    const model = await MachineCenter.findOne({
      where: {
        id: {
          [Op.eq]: id
        }
      }
    }).catch(error => {
      console.log(error);
      throw error.message
    });

    if (!model) {
      return res.status(404).send({
        message: "record Not Found",
        success: false
      });
    }

    model
      .update(machineCenter)
      .catch(error => {
        throw error.message
      })

    await insertMachineWeekDays(machineCenter.MachineWeekDays, id, transaction)
    await insertRoutingStages(machineCenter.MachineRoutingStages, id, transaction)

    // commit
    await transaction.commit();

    return res.status(200).send({
      model,
      success: true,
      message: "Success",
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

};

const insertMachineWeekDays = async (machineWeekDays, machineId, transaction) => {
  const existingMachineWeekDays = await MachineWeekDays.findAll({
    where: {
      machineId: machineId
    }
  }).catch(error => {
    console.log(error)
    throw error
  })

  const machineWeekDayIds = machineWeekDays.map(x => x.weekDayId)
  const machineWeekDaysToDelete = existingMachineWeekDays.filter(x => !machineWeekDayIds.includes(x.id))

  // Delete the items which is removed by user
  for (weekDay of machineWeekDaysToDelete) {
    await weekDay.destroy({
      transaction
    }).catch(error => {
      console.log(error)
      throw error
    })
  }

  for (let i = 0; i < machineWeekDays.length; i++) {
    const item = machineWeekDays[i]
    var inputParams = {
      machineId: machineId,
      weekDayId: item.weekDayId,
    }

    if (item.id) {
      const machineWeekDaysObj = await MachineWeekDays.findOne({
        where: {
          id: item.id
        },
      }).catch(error => {
        console.log(error)
        throw error
      })

      if (machineWeekDaysObj)
        await machineWeekDaysObj.update(inputParams, {
          transaction
        }).catch(error => {
          console.log(error)
          throw error
        })
    } else {
      await MachineWeekDays.create(inputParams, {
        transaction
      }).catch(e => {
        console.log(e)
        throw e
      })
    }
  }
}

const insertRoutingStages = async (routingStages, machineId, transaction) => {
  const existingMachineRoutingStages = await MachineRoutingStages.findAll({
    where: {
      machineId: machineId
    }
  }).catch(error => {
    console.log(error)
    throw error
  })

  const routingStageIds = routingStages.map(x => x.routingStageId)
  const routingStagesToDelete = existingMachineRoutingStages.filter(x => !routingStageIds.includes(x.id))

  // Delete the items which is removed by user
  for (routingStage of routingStagesToDelete) {
    await routingStage.destroy({
      transaction
    }).catch(error => {
      console.log(error)
      throw error
    })
  }

  for (let i = 0; i < routingStages.length; i++) {
    const item = routingStages[i]
    var inputParams = {
      machineId: machineId,
      routingStageId: item.routingStageId,
    }

    if (item.id) {
      const machineRoutingStagesObj = await MachineRoutingStages.findOne({
        where: {
          id: item.id
        },
      }).catch(error => {
        console.log(error)
        throw error
      })

      if (machineRoutingStagesObj)
        await machineRoutingStagesObj.update(inputParams, {
          transaction
        }).catch(error => {
          console.log(error)
          throw error
        })
    } else {
      await MachineRoutingStages.create(inputParams, {
        transaction
      }).catch(e => {
        console.log(e)
        throw e
      })
    }
  }
}

exports.destroy = async (req, res, next) => {
  const {
    id
  } = req.params;

  const machineCenter = await MachineCenter.findOne({
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

  if (!machineCenter) {
    return res.status(404).send({
      message: "record Not Found",
      success: false
    });
  }

  await machineCenter
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