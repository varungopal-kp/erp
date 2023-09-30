const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const db = require("../models/index");
const ProductionOrder = require("../models").ProductionOrder;
const ProductionOrderComponents =
  require("../models").ProductionOrderComponents;
const ProductionOrderMachines = require("../models").ProductionOrderMachines;
const ProductionOrderLabours = require("../models").ProductionOrderLabours;
const ProductionOrderMachinesAllocations =
  require("../models").ProductionOrderMachinesAllocations;
const ProductionIssueOIVLs = require("../models").ProductionIssueOIVLs;
const ItemMaster = require("../models").ItemMaster;
const ItemMasterUOMs = require("../models").ItemMasterUOMs;
const Employee = require("../models").Employee;
const MachineCenter = require("../models").MachineCenter;
const MachineWeekDays = require("../models").MachineWeekDays;
const UOM = require("../models").UOM;
const Warehouse = require("../models").Warehouse;
const WarehouseItems = require("../models").WarehouseItems;
const User = require("../models").User;
const ProductionType = require("../models").ProductionType;
const Status = require("../models").Status;
const _ = require("lodash");
const moment = require("moment");
const paginate = require("express-paginate");
const helper = require("../helpers/helper");
const status = require("../config/status");
const weekDays = require("../config/week-days");
const ProductionOrderMachineDates =
  require("../models").ProductionOrderMachineDates;
const ProductionOrderLabourDates =
  require("../models").ProductionOrderLabourDates;
const ProductionReceipt = require("../models").ProductionReceipt;
const ProductionIssue = require("../models").ProductionIssue;
const ProductionIssueItems = require("../models").ProductionIssueItems;
const ProductionCostingSummary = require("../models").ProductionCostingSummary;
const OIVLBarcodes = require("../models").OIVLBarcodes;
const OIVL = require("../models").OIVL;
const BillOfMaterial = require("../models").BillOfMaterials;
const BOMComponents = require("../models").BOMComponents;
const BOMLabour = require("../models").BOMLabours;
const BOMMachine = require("../models").BOMMachines;
const ItemCategory = require("../models").ItemCategory;
const PurchasePlan = require("../models").PurchasePlan;
const SalesOrderPlanProductions =
  require("../models").SalesOrderPlanProductions;
const SalesOrderPlanPurchases = require("../models").SalesOrderPlanPurchases;
const SalesOrderPlan = require("../models").SalesOrderPlan;
const ProductionUnit = require("../models").ProductionUnit;
const ProductionOrderBundleNumbers =
  require("../models").ProductionOrderBundleNumbers;
let purchasePlans = [];

exports.list = async (req, res, next) => {
  var filter = [];

  const include = [
    {
      model: ProductionOrderComponents,
      include: [
        {
          model: ItemMaster,
        },
      ],
    },

    {
      model: UOM,
    },
    {
      model: User,
    },
    {
      model: Status,
    },
    {
      model: db.ItemMaster,
      // attributes: [ 'code', 'name', 'inventoryUOMId' ],
      include: {
        model: UOM,
        as: "InventoryUOM",
        attributes: ["code", "name"],
      },
    },
  ];

  if (req.query.itemMaster) {
    include.push({
      model: ItemMaster,
      where: {
        name: {
          [Op.iLike]: `%${req.query.itemMaster}%`,
        },
      },
      include: {
        model: UOM,
        as: "InventoryUOM",
        attributes: ["code", "name"],
      },
    });
  }

  if (req.query.warehouse) {
    include.push({
      model: Warehouse,
      where: {
        name: {
          [Op.iLike]: `%${req.query.warehouse}%`,
        },
      },
    });
  } else {
    include.push({
      model: Warehouse,
    });
  }

  if (req.query.hasOwnProperty("issue")) {
    let productionOrders = await fetchProductionOrdersForProductionIssue(
      req,
      res
    );
    return res.send({
      productionOrders: productionOrders,
    });
  }

  if (req.query.hasOwnProperty("all")) {
    return res.send({
      productionOrders: await ProductionOrder.findAll({
        include: include,
        where: {
          deleted: {
            [Op.eq]: false,
          },
          statusId: {
            [Op.ne]: status.closed,
          },
        },
      }),
    });
  }

  if (req.query.hasOwnProperty("released")) {
    return res.send({
      productionOrders: await ProductionOrder.findAll({
        include: include,
        where: [
          {
            deleted: {
              [Op.eq]: false,
            },
            statusId: {
              [Op.notIn]: [status.planned, status.closed],
            },
          },
        ],
        order: [
          ["id", "DESC"],
          [ProductionOrderComponents, "id", "ASC"],
          [ProductionOrderMachines, "id", "ASC"],
          [ProductionOrderLabours, "id", "ASC"],
          [ProductionOrderMachinesAllocations, "id", "ASC"],
        ],
      }),
    });
  }

  if (req.query.hasOwnProperty("issued")) {
    console.log("#########################################################");

    include.push({
      model: db.OIVLBundleNumbers,
      attributes: [
        "id",
        "productionOrderId",
        "productionReceiptId",
        "bundleNumber",
        "numberOfPieces",
        "available",
      ],
      include: [
        {
          model: db.OIVL,
          attributes: ["docDate"],
        },
        {
          model: db.ProductionReceipt,
          attributes: ["series", "docNum", "docDate"],
        },
      ],
      // where: {
      //     available: true
      // },
      required: false,
    });

    return res.send({
      productionOrders: await ProductionOrder.findAll({
        include,
        where: [
          {
            deleted: false,
            statusId: {
              [Op.in]: [status.componentsIssued, status.productReceived],
            },
          },
        ],
        order: [
          ["id", "DESC"],
          [ProductionOrderComponents, "id", "ASC"],
        ],
      }),
    });
  }

  if (req.query.filtered != undefined) {
    req.query.filtered = JSON.stringify(req.query.filtered);

    var filtered = JSON.parse(req.query.filtered);
    for (var i = 0; i < filtered.length; i++) {
      filtered[i] = JSON.parse(filtered[i]);
    }

    filter = filtered.map((data) => {
      if (data.param == "statusId") {
        return {
          [data.param]: {
            [Op.eq]: data.value,
          },
        };
      } else {
        return {
          [data.param]: {
            [Op.iLike]: `${data.value}%`,
          },
        };
      }
    });
  }

  if (req.query.status && req.query.status == "planned") {
    filter.push({
      statusId: status.planned,
    });
  }

  if (req.query.status && req.query.status == "released") {
    filter.push({
      statusId: status.released,
    });
  }

  if (req.query.status && req.query.status == "rescheduled") {
    filter.push({
      statusId: status.rescheduled,
    });
  }

  if (req.query.status && req.query.status == "componentsIssued") {
    filter.push({
      statusId: status.componentsIssued,
    });
  }

  if (req.query.status && req.query.status == "productReceived") {
    filter.push({
      statusId: status.productReceived,
    });
  }

  filter.push({
    deleted: false,
  });

  await ProductionOrder.findAndCountAll({
    include: include,
    distinct: true,
    limit: req.query.limit,
    offset: req.skip,
    where: filter,
    order: [
      ["id", "DESC"],
      [ProductionOrderComponents, "id", "ASC"],
    ],
  })
    .then(async (results) => {
      const itemCount = results.count;
      const pageCount = Math.ceil(results.count / req.query.limit);

      return res.send({
        productionOrders: results.rows,
        pageCount,
        itemCount,
        pages: paginate.getArrayPages(req)(3, pageCount, req.query.page),
      });
    })
    .catch((error) => {
      console.log(error);
      return res.status(400).send({
        error: error,
      });
    });
};

const fetchProductionOrdersForProductionIssue = async (req, res) => {
  const include = [
    {
      model: ProductionOrderComponents,
      include: [
        {
          model: ItemMaster,
        },
      ],
    },
    {
      model: UOM,
    },
    {
      model: Status,
    },
    {
      model: db.ItemMaster,
      attributes: ["code", "name"],
    },
  ];

  let productionOrders = await ProductionOrder.findAll({
    include: include,
    where: {
      deleted: false,
      statusId: {
        [Op.notIn]: [status.planned, status.closed],
      },
    },
    order: [["id", "DESC"]],
  });

  return productionOrders;
};

exports.create = async (req, res, next) => {
  let { productionOrder } = req.body;

  const { ProductionOrderComponents } = productionOrder;

  const { ProductionOrderMachines } = productionOrder;

  const { ProductionOrderLabours } = productionOrder;

  if (req.user) productionOrder.createdUser = req.user.id;

  var include = [
    {
      model: ProductionOrderComponents,
      required: true,
    },
    {
      model: ProductionOrderMachines,
      required: true,
    },
    {
      model: ProductionOrderLabours,
      required: true,
    },
  ];

  let transaction;

  const nextDocNo = await helper.getNextDocumentNumber(
    "POR",
    productionOrder.series
  );

  if (nextDocNo) productionOrder.docNum = nextDocNo.nextNumber;

  productionOrder.statusId = status.planned;

  let month = moment(productionOrder.docDate).month() + 1;
  let year = moment(productionOrder.docDate).year();
  let quarter = moment(productionOrder.docDate).quarter();

  productionOrder.month = month;
  productionOrder.year = year;
  productionOrder.quarter = quarter;

  try {
    transaction = await db.sequelize.transaction().catch((e) => {
      console.log(e);
      throw e;
    });

    const newProductionOrder = await ProductionOrder.create(productionOrder, {
      transaction: transaction,
    }).catch((e) => {
      console.log(e);
      throw e;
    });

    if (newProductionOrder && newProductionOrder.id) {
      await insertProductionOrderComponents(
        ProductionOrderComponents,
        newProductionOrder.id,
        transaction
      );
      await insertProductionOrderMachines(
        ProductionOrderMachines,
        newProductionOrder.id,
        transaction
      );
      await insertProductionOrderLabours(
        ProductionOrderLabours,
        newProductionOrder.id,
        transaction
      );

      const message = `${
        req.user.username || "Unknown user"
      } created the document on ${moment().format("DD-MM-YYYY hh:mm:ss A")}`;
      await helper.createProductionOrderLog(
        newProductionOrder.id,
        message,
        req.user.id || null,
        transaction
      );

      await transaction.commit();

      return res.status(200).send({
        productionOrder: newProductionOrder,
        success: true,
        message: "Success",
      });
    } else throw "Insertion failed.";
  } catch (err) {
    // Rollback transaction only if the transaction object is defined
    if (transaction) await transaction.rollback();
    console.log(err);
    return res.status(400).send({
      success: false,
      message: "Failed",
      error: err,
    });
  }
};

exports.update = async (req, res, next) => {
  let { productionOrder } = req.body;

  const { ProductionOrderComponents } = productionOrder;

  const { ProductionOrderMachines } = productionOrder;

  const { ProductionOrderLabours } = productionOrder;

  const productionOrderId = req.params.id;

  let transaction = await db.sequelize.transaction().catch((e) => {
    console.log(e);
    throw e;
  });

  try {
    if (productionOrder.docNum) delete productionOrder.docNum;

    const existingProductionOrder = await ProductionOrder.findOne({
      where: {
        id: productionOrderId,
      },
    }).catch((e) => {
      console.log(e);
      throw e;
    });

    await existingProductionOrder
      .update(productionOrder, {
        transaction,
      })
      .catch((e) => {
        console.log(e);
        throw e;
      });

    if (existingProductionOrder && existingProductionOrder.id) {
      await insertProductionOrderComponents(
        ProductionOrderComponents,
        productionOrderId,
        transaction
      );
      await insertProductionOrderMachines(
        ProductionOrderMachines,
        productionOrderId,
        transaction
      );
      await insertProductionOrderLabours(
        ProductionOrderLabours,
        productionOrderId,
        transaction
      );
    } else {
      return res.status(404).send({
        success: false,
        message: "Production Order does not exist.",
      });
    }

    const message = `${
      req.user.username || "Unknown User"
    } updated the document on ${moment().format("DD-MM-YYYY hh:mm:ss A")}`;
    await helper.createProductionOrderLog(
      existingProductionOrder.id,
      message,
      req.user && req.user.id,
      transaction
    );

    // commit
    await transaction.commit();

    return res.status(200).send({
      productionOrder: existingProductionOrder,
      success: true,
      message: "Success",
    });
  } catch (err) {
    // Rollback transaction only if the transaction object is defined
    if (transaction) await transaction.rollback();
    console.log(err);
    return res.status(400).send({
      success: false,
      message: "Failed",
      error: err,
    });
  }
};

const insertProductionOrderComponents = async (
  productionOrderComponents,
  productionOrderId,
  transaction
) => {
  const existingComponents = await ProductionOrderComponents.findAll({
    where: {
      productionOrderId: productionOrderId,
    },
  }).catch((error) => {
    console.log(error);
    throw error;
  });

  const componentIds = productionOrderComponents.map((x) => x.id);
  const componentsToDelete = existingComponents.filter(
    (x) => !componentIds.includes(x.id)
  );

  // Delete the items which is removed by user
  for (component of componentsToDelete) {
    await component
      .destroy({
        transaction,
      })
      .catch((error) => {
        console.log(error);
        throw error;
      });
  }

  for (let i = 0; i < productionOrderComponents.length; i++) {
    const item = productionOrderComponents[i];
    var inputParams = {
      productId: item.productId,
      quantityPerUnit: item.quantityPerUnit,
      totalQuantity: item.totalQuantity,
      uomId: item.uomId,
      unitCost: item.unitCost,
      totalCost: item.totalCost,
      remarks: item.remarks,
      warehouseId: item.warehouseId,
      quantityInBaseUnit: item.quantityInBaseUnit,
      costInBaseUnit: item.costInBaseUnit,
    };

    if (item.id) {
      const componentObj = await ProductionOrderComponents.findOne({
        where: {
          id: item.id,
        },
      }).catch((error) => {
        console.log(error);
        throw error;
      });

      if (componentObj)
        await componentObj
          .update(inputParams, {
            transaction,
          })
          .catch((error) => {
            console.log(error);
            throw error;
          });
    } else {
      inputParams.productionOrderId = productionOrderId;

      await ProductionOrderComponents.create(inputParams, {
        transaction,
      }).catch((e) => {
        console.log(e);
        throw e;
      });
    }
  }
};

const insertProductionOrderMachines = async (
  productionOrderMachines,
  productionOrderId,
  transaction
) => {
  console.log(
    "###########################insertProductionOrderMachines###############################"
  );

  const existingMachines = await ProductionOrderMachines.findAll({
    where: {
      productionOrderId: productionOrderId,
    },
  }).catch((error) => {
    console.log(error);
    throw error;
  });

  const machineIds = productionOrderMachines.map((x) => x.id);
  const machinesToDelete = existingMachines.filter(
    (x) => !machineIds.includes(x.id)
  );

  // Delete the items which is removed by user
  for (machine of machinesToDelete) {
    await ProductionOrderMachineDates.destroy({
      where: {
        productionOrderMachineId: machine.id,
        productionOrderId: productionOrderId,
      },
      transaction,
    });

    await machine
      .destroy({
        transaction,
      })
      .catch((error) => {
        console.log(error);
        throw error;
      });
  }

  for (let i = 0; i < productionOrderMachines.length; i++) {
    const item = productionOrderMachines[i];
    var inputParams = {
      machineId: item.machineId,
      estimatedTime: item.estimatedTime,
      costPerHour: item.costPerHour,
      startDate: item.startDate,
      endDate: item.endDate,
      totalCost: item.totalCost,
      remarks: item.remarks,
      totalTime: item.totalTime,
      actualTotalTime: item.actualTotalTime,
      actualTotalCost: item.actualTotalCost,
      routingStageNumber: item.routingStageNumber,
      routingStageId: item.routingStageId,
      hoursInBaseUnit: item.hoursInBaseUnit,
      costInBaseUnit: item.costInBaseUnit,
      employeeId: item.employeeId,
      noOfLabours: item.noOfLabours,
    };

    if (item.id) {
      const productionOrderMachineObj = await ProductionOrderMachines.findOne({
        where: {
          id: item.id,
        },
      }).catch((error) => {
        console.log(error);
        throw error;
      });

      if (productionOrderMachineObj) {
        await productionOrderMachineObj
          .update(inputParams, {
            transaction,
          })
          .catch((error) => {
            console.log(error);
            throw error;
          });

        if (item.machineDates) {
          await insertProductionOrderMachineDates(
            item.machineDates,
            productionOrderMachineObj.id,
            productionOrderId,
            transaction
          );
        }
      }
    } else {
      inputParams.productionOrderId = productionOrderId;

      const productionOrderMachine = await ProductionOrderMachines.create(
        inputParams,
        {
          transaction,
        }
      ).catch((e) => {
        console.log(e);
        throw e;
      });

      if (
        item.ProductionOrderMachineDates &&
        item.ProductionOrderMachineDates.length > 0
      ) {
        await insertProductionOrderMachineDates(
          item.ProductionOrderMachineDates,
          productionOrderMachine.id,
          productionOrderId,
          transaction
        );
      }
    }
  }
};

const insertProductionOrderMachineDates = async (
  productionOrderMachineDates,
  productionOrderMachineId,
  productionOrderId,
  transaction
) => {
  console.log(
    "####################################insertProductionOrderMachineDates##########################################"
  );

  let suppliedIds = [];
  productionOrderMachineDates.forEach((item) => {
    if (item.id) suppliedIds.push(item.id);
  });

  //Delete removed items
  ProductionOrderMachineDates.destroy({
    where: {
      productionOrderMachineId: productionOrderMachineId,
      productionOrderId: productionOrderId,
      id: {
        [Op.notIn]: suppliedIds,
      },
    },
    transaction,
  });

  for (let i = 0; i < productionOrderMachineDates.length; i++) {
    const item = productionOrderMachineDates[i];
    var inputParams = {
      productionOrderMachineId: productionOrderMachineId,
      productionOrderId: productionOrderId,
      startDate: item.startDate,
      endDate: item.endDate,
      numberOfHours: item.numberOfHours,
    };

    if (item.id) {
      const productionOrderMachineDateObj =
        await ProductionOrderMachineDates.findOne({
          where: {
            id: item.id,
          },
        }).catch((error) => {
          console.log(error);
          throw error;
        });

      if (productionOrderMachineDateObj)
        await productionOrderMachineDateObj
          .update(inputParams, {
            transaction,
          })
          .catch((error) => {
            console.log(error);
            throw error;
          });
    } else {
      await ProductionOrderMachineDates.create(inputParams, {
        transaction,
      }).catch((e) => {
        console.log(e);
        throw e;
      });
    }
  }
};

const insertProductionOrderLabours = async (
  productionOrderLabours,
  productionOrderId,
  transaction
) => {
  const existingLabours = await ProductionOrderLabours.findAll({
    where: {
      productionOrderId: productionOrderId,
    },
  }).catch((error) => {
    console.log(error);
    throw error;
  });

  const labourIds = productionOrderLabours.map((x) => x.id);
  const laboursToDelete = existingLabours.filter(
    (x) => !labourIds.includes(x.id)
  );

  // Delete the items which is removed by user
  for (labour of laboursToDelete) {
    await ProductionOrderLabourDates.destroy({
      where: {
        productionOrderLabourId: labour.id,
        productionOrderId: productionOrderId,
      },
      transaction,
    });

    await labour
      .destroy({
        transaction,
      })
      .catch((error) => {
        console.log(error);
        throw error;
      });
  }

  for (let i = 0; i < productionOrderLabours.length; i++) {
    const item = productionOrderLabours[i];

    if (!item.employeeId) continue;

    var inputParams = {
      employeeId: item.employeeId,
      estimatedTime: item.estimatedTime,
      costPerHour: item.costPerHour,
      startDate: item.startDate,
      endDate: item.endDate,
      totalCost: item.totalCost,
      remarks: item.remarks,
      totalTime: item.totalTime,
      overTime: item.overTime,
      actualTotalTime: item.actualTotalTime,
      actualTotalCost: item.actualTotalCost,
      hoursInBaseUnit: item.hoursInBaseUnit,
      costInBaseUnit: item.costInBaseUnit,
    };

    if (item.id) {
      const labourObj = await ProductionOrderLabours.findOne({
        where: {
          id: item.id,
        },
      }).catch((error) => {
        console.log(error);
        throw error;
      });

      if (labourObj) {
        await labourObj
          .update(inputParams, {
            transaction,
          })
          .catch((error) => {
            console.log(error);
            throw error;
          });

        if (
          item.ProductionOrderLabourDates &&
          item.ProductionOrderLabourDates.length > 0
        ) {
          await insertProductionOrderLabourDates(
            item.ProductionOrderLabourDates,
            labourObj.id,
            productionOrderId,
            transaction
          );
        }
      }
    } else {
      inputParams.productionOrderId = productionOrderId;

      const productionOrderLabour = await ProductionOrderLabours.create(
        inputParams,
        {
          transaction,
        }
      ).catch((e) => {
        console.log(e);
        throw e;
      });

      if (productionOrderLabour) {
        if (item.ProductionOrderLabourDates) {
          await insertProductionOrderLabourDates(
            item.ProductionOrderLabourDates,
            productionOrderLabour.id,
            productionOrderId,
            transaction
          );
        }
      }
    }
  }
};

const insertProductionOrderLabourDates = async (
  productionOrderLabourDates,
  productionOrderLabourId,
  productionOrderId,
  transaction
) => {
  console.log(
    "####################################insertProductionOrderLabourDates##########################################"
  );

  let suppliedIds = [];
  productionOrderLabourDates.forEach((item) => {
    if (item.id) suppliedIds.push(item.id);
  });

  //Delete removed items
  ProductionOrderLabourDates.destroy({
    where: {
      productionOrderLabourId: productionOrderLabourId,
      productionOrderId: productionOrderId,
      id: {
        [Op.notIn]: suppliedIds,
      },
    },
    transaction,
  });

  for (let i = 0; i < productionOrderLabourDates.length; i++) {
    const item = productionOrderLabourDates[i];
    var inputParams = {
      productionOrderLabourId: productionOrderLabourId,
      productionOrderId: productionOrderId,
      startDate: item.startDate,
      endDate: item.endDate,
      numberOfHours: item.numberOfHours,
    };

    if (item.id) {
      const productionOrderLabourDateObj =
        await ProductionOrderLabourDates.findOne({
          where: {
            id: item.id,
          },
        }).catch((error) => {
          console.log(error);
          throw error;
        });

      if (productionOrderLabourDateObj)
        await productionOrderLabourDateObj
          .update(inputParams, {
            transaction,
          })
          .catch((error) => {
            console.log(error);
            throw error;
          });
    } else {
      await ProductionOrderLabourDates.create(inputParams, {
        transaction,
      }).catch((e) => {
        console.log(e);
        throw e;
      });
    }
  }
};

exports.getOne = async (req, res, next) => {
  const { id } = req.params;

  let itemMasterInclude = {
    model: ItemMaster,
  };

  if (req.query.hasOwnProperty("issue")) {
    itemMasterInclude = {
      model: ItemMaster,
      where: {
        consumptionTypeId: 1, // Manual Consumption Type
      },
    };
  }

  const include = [
    {
      model: ProductionOrderComponents,
      include: [
        {
          model: ItemMaster,
        },
      ],
    },
    {
      model: ProductionOrderMachines,
      include: [
        {
          model: MachineCenter,
        },
        {
          model: ProductionOrderMachineDates,
          as: "machineDates",
        },
      ],
    },
    {
      model: ProductionOrderLabours,
      include: [
        {
          model: Employee,
        },
        {
          model: ProductionOrderLabourDates,
          as: "labourDates",
        },
      ],
    },
    {
      model: UOM,
    },
    {
      model: User,
    },
    {
      model: Status,
    },
    {
      model: ItemMaster,
      include: {
        model: UOM,
        as: "InventoryUOM",
        attributes: ["code", "name"],
      },
    },
    {
      model: ProductionOrderMachinesAllocations,
      include: [
        {
          model: MachineCenter,
        },
      ],
    },
    {
      model: ProductionCostingSummary,
      include: [
        {
          model: UOM,
        },
      ],
    },
    {
      model: db.OIVLBundleNumbers,
      attributes: [
        "id",
        "productionOrderId",
        "productionReceiptId",
        "bundleNumber",
        "numberOfPieces",
        "available",
      ],
      include: [
        {
          model: db.OIVL,
          attributes: ["docDate"],
        },
        {
          model: db.ProductionReceipt,
          attributes: ["series", "docNum", "docDate"],
        },
      ],
      // where: {
      //     available: true
      // },
      required: false,
    },
    {
      model: ProductionIssue,
      attributes: ["id"],
      include: [
        {
          model: ProductionIssueOIVLs,
          attributes: ["oivlId", "oivlBarcodeId"],
          include: [
            {
              model: OIVL,
              attributes: ["itemMasterId", "barcode"],
              include: {
                model: ItemMaster,
                attributes: ["code", "name"],
                as: "ItemMaster",
              },
            },
            {
              model: OIVLBarcodes,
              attributes: ["itemMasterId", "barcode"],
              include: {
                model: ItemMaster,
                attributes: ["code", "name"],
              },
            },
          ],
        },
      ],
    },
    {
      model: db.UOM,
      as: "DefaultProductUOM",
      attributes: ["code", "name"],
    },
    {
      model: db.UOM,
      as: "DefaultComponentUOM",
      attributes: ["code", "name"],
    },
    {
      model: db.ItemMaster,
      attributes: ["code", "name"],
      as: "DefaultComponent",
    },
  ];

  await ProductionOrder.findOne({
    where: {
      id,
      deleted: false,
    },
    include,
    order: [
      ["id", "DESC"],
      [ProductionOrderComponents, "id", "ASC"],
      [ProductionOrderMachines, "id", "ASC"],
      [ProductionOrderLabours, "id", "ASC"],
      [ProductionOrderMachinesAllocations, "id", "ASC"],
    ],
  })
    .then((result) => {
      if (!result) {
        return res.status(404).send({
          message: "record Not Found",
          success: false,
        });
      }
      return res.status(200).send({
        productionOrder: result,
        success: true,
        message: "Success",
      });
    })
    .catch((error) =>
      res.status(400).send({
        error: error.message,
        success: false,
        message: "Failed",
      })
    );
};

exports.destroy = async (req, res, next) => {
  const { id } = req.params;

  const productionOrder = await ProductionOrder.findOne({
    where: {
      id: id,
    },
  }).catch((error) => {
    console.log(error);
    throw error;
  });

  if (!productionOrder) {
    return res.status(404).send({
      message: "record Not Found",
      success: false,
    });
  }

  await productionOrder
    .update({
      deleted: true,
    })
    .catch((error) => {
      console.log(error);
      throw error;
    });

  const message = `${
    req.user.username || "Unknown User"
  } deleted the document on ${moment().format("DD-MM-YYYY hh:mm:ss A")}`;
  await helper.createProductionOrderLog(
    productionOrder.id,
    message,
    req.user && req.user.id,
    null
  );

  return res.status(204).send({
    message: "Deleted Successfully.",
    success: true,
  });
};

exports.close = async (req, res, next) => {
  const productionOrderId = req.params.id;

  let { productionOrder } = req.body;

  if (!req.query.hasOwnProperty("forceClose")) {
    const isProductionIssueCompleted = await checkProductionIssuePending(
      productionOrderId
    );

    const data = {
      productionOrder,
    };

    if (!isProductionIssueCompleted) {
      return res.status(401).send({
        success: false,
        message: "Production Issue Pending for the Production Order.",
        isProductionIssueCompleted: false,
        id: productionOrderId,
        data,
      });
    }
  }

  let transaction = await db.sequelize.transaction().catch((e) => {
    console.log(e);
    throw e;
  });

  try {
    await ProductionOrder.update(
      {
        statusId: status.closed,
        damageQuantity: productionOrder.damageQuantity,
        damageUOMId: productionOrder.damageUOMId,
        damageWarehouseId: productionOrder.damageWarehouseId,
      },
      {
        where: {
          id: productionOrderId,
        },
        transaction,
      }
    ).catch((e) => {
      console.log(e);
      throw e;
    });
    // await updateDamageQuantity(productionOrder, productionOrderId, transaction);

    const actualCosts = await updateProductionOrderActualTime(
      productionOrder,
      transaction
    );

    await updateProductionOrderSummary(
      productionOrderId,
      actualCosts.actualTotalMachineCost,
      actualCosts.actualTotalLabourCost,
      transaction
    );

    const message = `${
      req.user.username || "Unknown User"
    } closed the document on ${moment().format("DD-MM-YYYY hh:mm:ss A")}`;
    await helper.createProductionOrderLog(
      productionOrder.id,
      message,
      req.user.id,
      transaction
    );

    // commit
    await transaction.commit();

    return res.status(200).send({
      success: true,
      message: "Production Closed Successfully.",
      isProductionIssueCompleted: true,
    });
  } catch (err) {
    // Rollback transaction only if the transaction object is defined
    if (transaction) await transaction.rollback();
    console.log(err);
    return res.status(400).send({
      success: false,
      message: "Failed",
      error: err,
    });
  }
};

const updateDamageQuantity = async (params, productionOrderId, transaction) => {
  console.log(
    "#########################updateDamageQuantity###############################"
  );

  const productionOrder = await db.ProductionOrder.findOne({
    where: {
      id: productionOrderId,
    },
    transaction,
  }).catch((e) => {
    throw e;
  });

  const damageQuantityInBaseUnit = await helper.getConvertedQuantity(
    params.damageUOMId,
    productionOrder.productId,
    params.damageQuantity
  );

  let warehouseItem = await db.WarehouseItems.findOne({
    where: {
      itemMasterId: productionOrder.productId,
      warehouseId: params.damageWarehouseId,
      isDamage: true,
    },
    transaction,
  }).catch((e) => {
    throw e;
  });

  if (warehouseItem) {
    await warehouseItem
      .update(
        {
          onHand: +warehouseItem.warehouseItem + +damageQuantityInBaseUnit,
        },
        {
          transaction,
        }
      )
      .catch((e) => {
        throw e;
      });
  } else {
    await db.WarehouseItems.create(
      {
        itemMasterId: productionOrder.productId,
        warehouseId: productionOrder.damageWarehouseId,
        onHand: damageQuantityInBaseUnit,
        price: 0,
        isDamage: true,
      },
      {
        transaction,
      }
    ).catch((e) => {
      throw e;
    });
  }
};

const convertQtyToBaseUnit = async (
  uomId,
  productId,
  quantity,
  slittingOrderId,
  transaction
) => {
  console.log(
    "####################################convertQtyToBaseUnit#########################"
  );

  const itemMaster = await db.ItemMaster.findOne({
    where: {
      id: productId,
    },
    transaction,
    attributes: ["width"],
  }).catch((e) => {
    throw e;
  });

  if (uomId != 23) {
    let quantityInBaseUnit = await getConvertedQuantity(
      uomId,
      productId,
      quantity
    );

    return quantityInBaseUnit;
  }

  const slittingOrder = await db.SlittingOrder.findOne({
    where: {
      id: slittingOrderId,
    },
    transaction,
    attributes: ["productId", "oivlId", "width", "coilWeight"],
  }).catch((e) => {
    throw e;
  });

  const coilWeight = slittingOrder.coilWeight;
  const totalWidth = slittingOrder.width;
  const semiFinishedWidth = itemMaster.width;

  // Calculating the weight of the slitted coil piece
  let quantityInMT = parseFloat(
    (coilWeight / totalWidth) * semiFinishedWidth
  ).toFixed(4);

  console.log("quantityInMT", quantityInMT);

  return quantityInMT * quantity;
};

const checkProductionIssuePending = async (productionOrderId) => {
  const productionOrder = await ProductionOrder.findOne({
    where: {
      id: productionOrderId,
    },
    include: [
      {
        model: ProductionOrderComponents,
      },
    ],
  }).catch((e) => {
    console.log(e);
    throw e;
  });

  const productionOrderComponents = productionOrder.ProductionOrderComponents;
  let isCompleteIssued = true;
  let isFinished = productionOrderComponents.length;

  // productionOrderComponents.forEach((component, index) => {
  for (
    let i = 0;
    (length = productionOrderComponents.length), i < length;
    i++
  ) {
    isFinished--;
    const component = productionOrderComponents[i];
    const itemMasterId = component.productId;
    const totalRequiredQuantity = component.totalQuantity;

    const productionIssueItems = await ProductionIssueItems.findAll({
      include: [
        {
          model: ProductionIssue,
          required: true,
          include: {
            model: ProductionOrder,
            where: {
              id: productionOrderId,
            },
            required: true,
          },
        },
      ],
      where: {
        productId: itemMasterId,
      },
    }).catch((e) => {
      console.log(e);
      throw e;
    });

    if (!productionIssueItems || productionIssueItems.length === 0) {
      isCompleteIssued = false;
      return isCompleteIssued;
    }

    let issuedQty = productionIssueItems
      .map((productionIssueItem) => +productionIssueItem.issuedQuantity)
      .reduce((a, b) => a + b, 0);

    console.log("totalRequiredQuantity", totalRequiredQuantity);

    if (issuedQty < totalRequiredQuantity) {
      isCompleteIssued = false;
      return isCompleteIssued;
    }

    if (isFinished === 0) {
      return isCompleteIssued;
    }
    // });
  }
};

exports.bulkClose = async (req, res, next) => {
  const { productionOrders } = req.body;

  let transaction = await db.sequelize.transaction().catch((e) => {
    console.log(e);
    throw e;
  });

  try {
    for (let i = 0; i < productionOrders.length; i++) {
      const productionOrderId = productionOrders[i].id;

      await ProductionOrder.update(
        {
          statusId: status.closed,
        },
        {
          where: {
            id: productionOrderId,
          },
          transaction,
        }
      ).catch((e) => {
        console.log(e);
        throw e;
      });

      await updateProductionOrderSummary(productionOrderId, transaction);
    }

    // commit
    await transaction.commit();

    return res.status(200).send({
      success: true,
      message: "Production Closed Successfully.",
    });
  } catch (err) {
    // Rollback transaction only if the transaction object is defined
    if (transaction) await transaction.rollback();
    console.log(err);
    return res.status(400).send({
      success: false,
      message: "Failed",
      error: err,
    });
  }
};

const updateProductionOrderSummary = async (
  productionOrderId,
  totalMachineCost,
  totalLabourCost,
  transaction
) => {
  console.log(
    "########################updateProductionOrderSummary##############################"
  );

  const productionOrder = await ProductionOrder.findOne({
    where: {
      id: productionOrderId,
      deleted: {
        [Op.eq]: false,
      },
    },
  }).catch((error) => {
    throw error;
  });

  if (productionOrder && productionOrder.id) {
    const productionOrderComponents = await ProductionOrderComponents.findAll({
      where: {
        productionOrderId: productionOrderId,
      },
      raw: true,
    }).catch((error) => {
      throw error;
    });

    const productionOrderMachines = await ProductionOrderMachines.findAll({
      where: {
        productionOrderId: productionOrderId,
      },
      raw: true,
    }).catch((error) => {
      throw error;
    });

    const productionOrderLabours = await ProductionOrderLabours.findAll({
      where: {
        productionOrderId: productionOrderId,
      },
      raw: true,
    }).catch((error) => {
      throw error;
    });

    const productionIssues = await ProductionIssue.findAll({
      where: {
        productionOrderId: productionOrderId,
      },
      raw: true,
    }).catch((error) => {
      throw error;
    });

    const productionReceipts = await ProductionReceipt.findAll({
      where: {
        productionOrderId: productionOrderId,
      },
      raw: true,
    }).catch((error) => {
      throw error;
    });

    let plannedTotalComponentCost = 0,
      plannedTotalMachineCost = 0,
      plannedTotalLabourCost = 0,
      plannedTotalCost = 0,
      plannedUnitCost = 0,
      actualTotalComponentCost = 0,
      actualTotalReceiptCost = 0,
      actualTotalMachineCost = totalMachineCost,
      actualTotalLabourCost = totalLabourCost;

    if (productionOrderComponents && productionOrderComponents.length > 0) {
      productionOrderComponents.map((item) => {
        if (item.totalCost)
          plannedTotalComponentCost =
            +plannedTotalComponentCost + +item.totalCost;
      });
    }

    if (productionOrderMachines && productionOrderMachines.length > 0) {
      productionOrderMachines.map((item) => {
        if (item.totalCost) {
          plannedTotalMachineCost = +plannedTotalMachineCost + +item.totalCost;
          // actualTotalMachineCost = +actualTotalMachineCost + +item.actualTotalCost
        }
      });
    }

    if (productionOrderLabours && productionOrderLabours.length > 0) {
      productionOrderLabours.map((item) => {
        if (item.totalCost) {
          plannedTotalLabourCost = +plannedTotalLabourCost + +item.totalCost;
          // actualTotalLabourCost = +actualTotalLabourCost + +item.actualTotalCost
        }
      });
    }

    if (productionIssues && productionIssues.length > 0) {
      productionIssues.map((item) => {
        if (item.grandTotal)
          actualTotalComponentCost =
            +actualTotalComponentCost + +item.grandTotal;
      });
    }

    if (productionReceipts && productionReceipts.length > 0) {
      productionReceipts.map((item) => {
        if (item.grandTotal)
          actualTotalReceiptCost = +actualTotalReceiptCost + +item.grandTotal;
      });
    }

    plannedTotalCost =
      plannedTotalComponentCost +
      plannedTotalMachineCost +
      plannedTotalLabourCost;
    plannedUnitCost = plannedTotalCost / +productionOrder.plannedQuantity;

    let inputParams = {
      productionOrderId,
      plannedQuantity: +productionOrder.plannedQuantity,
      plannedUOMId: +productionOrder.uomId,
      plannedUnitCost,
      plannedTotalCost,
      plannedComponentCost: plannedTotalComponentCost,
      plannedMachineCost: plannedTotalMachineCost,
      plannedLabourCost: plannedTotalLabourCost,
      actualQuantity: +productionOrder.receivedQuantity,
      actualMachineCost: actualTotalMachineCost,
      actualTotalLabourCost,
      actualComponentCost: actualTotalComponentCost,
      actualUnitCost:
        productionOrder.receivedQuantity && productionOrder.receivedQuantity > 0
          ? (actualTotalComponentCost +
              actualTotalMachineCost +
              actualTotalLabourCost) /
            productionOrder.receivedQuantity
          : 0,
      actualTotalCost:
        actualTotalComponentCost +
        actualTotalMachineCost +
        actualTotalLabourCost,
    };

    await ProductionCostingSummary.create(inputParams, {
      transaction,
    }).catch((error) => {
      throw error;
    });
  }
};

const updateProductionOrderActualTime = async (
  productionOrder,
  transaction
) => {
  console.log(
    "########################updateProductionOrderActualTime##############################"
  );
  const productionOrderMachines = productionOrder.ProductionOrderMachines;
  const productionOrderLabours = productionOrder.ProductionOrderLabours;

  let actualTotalMachineCost = 0,
    actualTotalLabourCost = 0;

  for (let i = 0; i < productionOrderMachines.length; i++) {
    const element = productionOrderMachines[i];

    await ProductionOrderMachines.update(
      {
        actualTotalTime: element.actualTotalTime,
        actualTotalCost: element.actualTotalCost,
      },
      {
        where: {
          id: element.id,
        },
        transaction,
      }
    ).catch((e) => {
      console.log(e);
      throw e;
    });
  }

  for (let j = 0; j < productionOrderLabours.length; j++) {
    const element = productionOrderLabours[j];

    await ProductionOrderLabours.update(
      {
        actualTotalTime: element.actualTotalTime,
        actualTotalCost: element.actualTotalCost,
        overTime: element.overTime,
      },
      {
        where: {
          id: element.id,
        },
        transaction,
      }
    ).catch((e) => {
      console.log(e);
      throw e;
    });
  }

  productionOrderMachines.map((item) => {
    if (item.actualTotalCost) {
      actualTotalMachineCost = +actualTotalMachineCost + +item.actualTotalCost;
    }
  });

  productionOrderLabours.map((item) => {
    if (item.actualTotalCost) {
      actualTotalLabourCost = +actualTotalLabourCost + +item.actualTotalCost;
    }
  });

  return {
    actualTotalMachineCost,
    actualTotalLabourCost,
  };
};

exports.release = async (req, res, next) => {
  let transaction;

  try {
    let { productionOrder } = req.body;

    const productionOrderId = req.params.id;

    const machineAllocations = productionOrder.machineAllocations;

    transaction = await db.sequelize.transaction().catch((e) => {
      console.log(e);
      throw e;
    });

    if (!machineAllocations)
      return res.status(400).send({
        success: false,
        message: "Machine Allocations missing!",
      });

    const barcode = productionOrder.barcode;
    const initialNumber = productionOrder.initialNumber
      ? productionOrder.initialNumber
      : null;

    const productionOrderObj = await ProductionOrder.findOne({
      where: {
        id: productionOrderId,
      },
    }).catch((e) => {
      console.log(e);
      throw e;
    });

    //Check whether barcode is already taken
    await checkBarcodeAvailable(
      barcode,
      initialNumber,
      productionOrderObj.productId
    );

    machineAllocations.forEach((machineAllocation) => {
      machineAllocation.month = moment(machineAllocation.date).month() + 1;
      machineAllocation.year = moment(machineAllocation.date).year();
      machineAllocation.quarter = moment(machineAllocation.date).quarter();
    });

    await ProductionOrderMachinesAllocations.bulkCreate(machineAllocations, {
      transaction,
    }).catch((e) => {
      console.log(e);
      throw e;
    });

    await ProductionOrder.update(
      {
        statusId: status.released,
        releaseDate: productionOrder.date,
        barcode: barcode,
        initialNumber: initialNumber,
      },
      {
        where: {
          id: productionOrderId,
        },
        transaction,
      }
    ).catch((e) => {
      console.log(e);
      throw e;
    });
    if (
      productionOrder.bundleNumbers &&
      productionOrder.bundleNumbers.length > 0 &&
      productionOrder.bundleNextNumber
    )
      await updateBundleNumbers(
        productionOrderObj,
        productionOrder,
        transaction
      );

    const message = `${
      req.user.username || "Unknown user"
    } released the document on ${moment().format("DD-MM-YYYY hh:mm:ss A")}`;
    await helper.createProductionOrderLog(
      productionOrderObj.id,
      message,
      req.user.id || null,
      transaction
    );
    // commit
    await transaction.commit();

    return res.status(200).send({
      success: true,
      message: "Production Released Successfully.",
    });
  } catch (err) {
    // Rollback transaction only if the transaction object is defined
    if (transaction) await transaction.rollback();
    console.log(err);
    return res.status(400).send({
      success: false,
      message: "Failed",
      error: err,
    });
  }
};

const updateBundleNumbers = async (
  productionOrder,
  productionOrderParams,
  transaction
) => {
  //Update bundleNextNumber in Item Master
  await ItemMaster.update(
    {
      bundleNextNumber: productionOrderParams.bundleNextNumber,
    },
    {
      where: {
        id: productionOrder.productId,
      },
      transaction,
    }
  ).catch((e) => {
    console.log(e);
    throw e;
  });

  const bundleNos = productionOrderParams.bundleNumbers;

  let quantityInBaseUnit = await helper.getConvertedQuantity(
    3, // Bundle
    productionOrder.productId,
    1
  );

  for (let i = 0; i < bundleNos.length; i++) {
    const bundleNumber = bundleNos[i];

    await ProductionOrderBundleNumbers.create(
      {
        productionOrderId: productionOrder.id,
        bundleNumber: bundleNumber,
        quantityInBaseUnit: quantityInBaseUnit,
      },
      {
        transaction,
      }
    ).catch((e) => {
      console.log(e);
      throw e;
    });
  }
};

exports.releasedList = async (req, res, next) => {
  var include = [
    {
      model: ProductionOrderComponents,
      include: [
        {
          model: ItemMaster,
        },
      ],
    },
    {
      model: ProductionOrderMachines,
      include: [
        {
          model: MachineCenter,
        },
      ],
    },
    {
      model: ProductionOrderLabours,
      include: [
        {
          model: Employee,
        },
      ],
    },
    {
      model: ItemMaster,
    },
    {
      model: UOM,
    },
    {
      model: Warehouse,
    },
    {
      model: User,
    },
    {
      model: Status,
    },
  ];

  return res.send({
    productionOrders: await ProductionOrder.findAll({
      include: include,
      where: {
        deleted: {
          [Op.eq]: false,
        },
        statusId: {
          [Op.eq]: status.released,
        },
      },
    }),
  });
};

exports.productionTypeList = async (req, res, next) => {
  await ProductionType.findAll({
    attributes: ["id", "name"],
  })
    .then((result) => {
      if (!result) {
        return res.status(404).send({
          message: "records Not Found",
          success: false,
        });
      }
      return res.status(200).send({
        productionTypes: result,
        success: true,
        message: "Success",
      });
    })
    .catch((error) =>
      res.status(400).send({
        error,
        success: false,
        message: "Failed",
      })
    );
};

exports.checkMachineAllocation = async (req, res, next) => {
  const { id } = req.params;

  if (!req.query.date)
    res.status(404).send({
      success: false,
      message: "Please provide a valid start date !!!",
    });

  let reschedule = false;
  const startDate = req.query.date;

  let machineAllocations = [];

  const productionOrder = await ProductionOrder.findOne({
    where: {
      id: {
        [Op.eq]: id,
      },
      deleted: {
        [Op.eq]: false,
      },
    },
    include: [
      {
        model: ProductionOrderMachines,
      },
    ],
  }).catch((error) =>
    res.status(400).send({
      error,
      success: false,
      message: "Failed",
    })
  );

  if (productionOrder && productionOrder.ProductionOrderMachines) {
    let nextDate = moment(startDate, "YYYY-MM-DD").toDate();
    console.log(
      "########################################################################"
    );
    console.log("startDate", nextDate);
    for (let i = 0; i < productionOrder.ProductionOrderMachines.length; i++) {
      let productionOrderMachine = productionOrder.ProductionOrderMachines[i];

      nextDate = await generateMachineAllocation(
        productionOrderMachine,
        nextDate,
        machineAllocations,
        productionOrder.id,
        productionOrder.productionUnitId,
        reschedule
      );
    }

    // let message = ""
    // if (moment(nextDate) > moment(dueDate)) {
    //     // Completion date is ahead of due date
    //     message = "Completion date is ahead of due date given."
    //     console.log("Completion date is ahead of due date given.")
    // }

    let dateExceeded = false;

    if (machineAllocations && machineAllocations.length > 0) {
      let productionStartDate = moment(machineAllocations[0].date);
      let today = moment();

      if (productionStartDate.diff(today, "days") > 7) {
        dateExceeded = true;
      }
    }

    //Generate bundle numbers
    let itemMaster = await ItemMaster.findOne({
      where: {
        id: productionOrder.productId,
      },
      include: {
        model: ItemMasterUOMs,
        where: {
          uomId: 3, //Bundle
        },
      },
      attributes: [
        "managementTypeId",
        "bundleString1",
        "bundleString2",
        "bundleNextNumber",
      ],
    }).catch((e) => {
      console.log(e);
      throw e;
    });

    let generatedBundleNos;
    if (
      itemMaster &&
      itemMaster.managementTypeId == 4 &&
      (itemMaster.inventoryUOMId === 3 ||
        (itemMaster.ItemMasterUOMs && itemMaster.ItemMasterUOMs.length > 0))
    ) {
      generatedBundleNos = await generateBundleNumbers(
        productionOrder,
        itemMaster,
        req,
        res
      );
    }

    return res.status(200).send({
      machineAllocations: machineAllocations,
      message: "success",
      success: true,
      dateExceeded: dateExceeded,
      rescheduled: false,
      bundleNumbers:
        generatedBundleNos && generatedBundleNos.bundleNos
          ? generatedBundleNos.bundleNos
          : [],
      bundleNextNumber:
        generatedBundleNos && generatedBundleNos.bundleNextNumber
          ? generatedBundleNos.bundleNextNumber
          : null,
    });
  } else {
    return res.status(400).send({
      message: "Production Order not found",
      success: false,
    });
  }
};

const generateBundleNumbers = async (productionOrder, itemMaster, req, res) => {
  console.log(
    "###################################generateBundleNumbers##################################"
  );

  let quantityInBaseUnit = await helper.getConvertedQuantity(
    productionOrder.uomId,
    productionOrder.productId,
    productionOrder.plannedQuantity
  );

  let bundleConversionFactor = 1;
  if (itemMaster.inventoryUOMId != 3)
    bundleConversionFactor = itemMaster.ItemMasterUOMs[0].conversionFactor;

  let bundleQty = quantityInBaseUnit / bundleConversionFactor;
  let bundleNos = [];
  let bundleNextNumber = itemMaster.bundleNextNumber || 1001;

  if (itemMaster.bundleString1 === "batchNo" && !req.query.barcode) {
    res.status(404).send({
      success: false,
      message: "Please provide a barcode !!!",
    });
  }

  let barcode = req.query.barcode;

  for (let i = 0; i < bundleQty; i++) {
    let bundleString1 = "";

    switch (itemMaster.bundleString1) {
      case "monthYear":
        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];

        bundleString1 =
          monthNames[moment().month()].toString() + moment().year().toString();
        break;
      case "batchNo":
        bundleString1 = barcode;
        break;
      default:
        bundleString1 = itemMaster.bundleString1;
        break;
    }

    const bundleNo =
      bundleString1 + itemMaster.bundleString2 + bundleNextNumber.toString();

    bundleNos.push(bundleNo);
    bundleNextNumber++;
  }

  return {
    bundleNos: bundleNos,
    bundleNextNumber: bundleNextNumber,
  };
};

exports.statusWiseReport = async (req, res, next) => {
  var include = [
    {
      model: ProductionOrderComponents,
      include: [
        {
          model: ItemMaster,
        },
      ],
    },
    {
      model: ProductionOrderMachines,
      include: [
        {
          model: MachineCenter,
        },
      ],
    },
    {
      model: ProductionOrderLabours,
      include: [
        {
          model: Employee,
        },
      ],
    },
    {
      model: UOM,
    },
    {
      model: User,
    },
    {
      model: Status,
    },
    {
      model: ItemMaster,
    },
    {
      model: Warehouse,
    },
    {
      model: ProductionOrderMachinesAllocations,
      include: [
        {
          model: MachineCenter,
        },
      ],
    },
  ];

  const plannedOrders = await ProductionOrder.findAll({
    include: include,
    where: {
      deleted: false,
      statusId: status.planned,
    },
  });

  const releasedOrders = await ProductionOrder.findAll({
    include: include,
    where: {
      deleted: false,
      statusId: status.released,
    },
  });

  const componentsIssuedOrders = await ProductionOrder.findAll({
    include: include,
    where: {
      deleted: false,
      statusId: status.componentsIssued,
    },
  });

  const productReceivedOrders = await ProductionOrder.findAll({
    include: include,
    where: {
      deleted: false,
      statusId: status.productReceived,
    },
  });

  const closedOrders = await ProductionOrder.findAll({
    include: include,
    where: {
      deleted: false,
      statusId: status.closed,
    },
  });

  const productionOrders = {
    plannedOrders: plannedOrders,
    releasedOrders: releasedOrders,
    componentsIssuedOrders: componentsIssuedOrders,
    productReceivedOrders: productReceivedOrders,
    closedOrders: closedOrders,
  };

  return res.send({
    productionOrders: productionOrders,
    success: true,
  });
};

const generateMachineAllocation = async (
  productionOrderMachine,
  nextDate,
  machineAllocations,
  productionOrderId,
  productionUnitId,
  reschedule
) => {
  let currentAllocatedLastDate,
    remainingHoursOnLastDate = null;

  const machine = await MachineCenter.findOne({
    where: {
      id: productionOrderMachine.machineId,
    },
  });

  if (machine && machine.id) {
    let numberOfHours = +productionOrderMachine.totalTime;
    let machineCapacity = +machine.capacity || 8;

    console.log("nextDate", nextDate);

    //Check whether the nextDate is a working day for the Machine.
    nextDate = await checkIsWorkingDay(
      nextDate,
      productionOrderMachine.machineId
    );

    let whereParams = {
      machineId: productionOrderMachine.machineId,
      date: {
        [Op.gte]: nextDate,
      },
    };

    if (reschedule) {
      whereParams.productionOrderId = {
        [Op.ne]: productionOrderId,
      };
    }

    //Get the last date of the Machine Allocated
    const productionOrderMachinesAllocated =
      await ProductionOrderMachinesAllocations.findOne({
        where: whereParams,

        // {
        //     machineId: productionOrderMachine.machineId,
        //     date: {
        //         [Op.gte]: nextDate
        //     },
        //     // remainingHours: {
        //     //     [Op.gt]: 0
        //     // }
        // },
        order: [["id", "DESC"]],
      });

    if (
      productionOrderMachinesAllocated &&
      productionOrderMachinesAllocated.date
    ) {
      currentAllocatedLastDate = productionOrderMachinesAllocated.date;
      remainingHoursOnLastDate =
        +productionOrderMachinesAllocated.remainingHours;
    } else currentAllocatedLastDate = nextDate;

    // console.log("productionOrderMachinesAllocated", productionOrderMachinesAllocated)

    // console.log("remainingHoursOnLastDate", remainingHoursOnLastDate)

    let numberOfDays = (numberOfHours / machineCapacity).toFixed(4);

    //Check whether time remaining on the last allocated day & allocate
    if (remainingHoursOnLastDate > 0) {
      let remainingHours = 0;

      // Get the remaining hours on the day
      if (numberOfHours <= remainingHoursOnLastDate) {
        remainingHours = (remainingHoursOnLastDate - numberOfHours).toFixed(4);
      }

      machineAllocations.push({
        date: currentAllocatedLastDate,
        machineId: machine.id,
        numberOfHours:
          +numberOfHours <= +remainingHoursOnLastDate
            ? numberOfHours
            : remainingHoursOnLastDate,
        remainingHours:
          remainingHours && remainingHours >= 0 ? remainingHours : 0,
        machine: machine.name,
        productionOrderId: productionOrderId,
        productionUnitId: productionUnitId,
        employeeId: productionOrderMachine.employeeId,
        noOfLabours: productionOrderMachine.noOfLabours,
      });

      if (numberOfHours > remainingHoursOnLastDate) {
        // console.log("remainingHoursOnLastDate", remainingHoursOnLastDate)
        numberOfHours = (numberOfHours - remainingHoursOnLastDate).toFixed(4);
        numberOfDays = (numberOfHours / machineCapacity).toFixed(4);
      } else {
        numberOfHours = 0;
        numberOfDays = 0;
      }

      currentAllocatedLastDate = moment(currentAllocatedLastDate).add(
        1,
        "days"
      );
    } else if (remainingHoursOnLastDate == 0) {
      currentAllocatedLastDate = moment(currentAllocatedLastDate).add(
        1,
        "days"
      );
    }

    console.log("remainingHoursOnLastDate", remainingHoursOnLastDate);
    console.log("numberOfHours", numberOfHours);
    console.log("numberOfDays", numberOfDays);

    if (numberOfDays >= 1) {
      //Loop and allocate the days
      for (let i = 0; i < Math.floor(numberOfDays); i++) {
        machineAllocations.push({
          date: currentAllocatedLastDate,
          machineId: machine.id,
          numberOfHours: machineCapacity,
          remainingHours: 0,
          machine: machine.name,
          productionOrderId: productionOrderId,
          productionUnitId: productionUnitId,
          employeeId: productionOrderMachine.employeeId,
          noOfLabours: productionOrderMachine.noOfLabours,
        });

        //Last loop
        if (i === Math.floor(numberOfDays) - 1) {
          let partialDay = +numberOfDays - Math.floor(numberOfDays);

          if (partialDay > 0) {
            currentAllocatedLastDate = moment(currentAllocatedLastDate).add(
              1,
              "days"
            );

            machineAllocations.push({
              date: currentAllocatedLastDate,
              machineId: machine.id,
              numberOfHours: (partialDay * machineCapacity).toFixed(4),
              remainingHours: (
                machineCapacity -
                partialDay * machineCapacity
              ).toFixed(4),
              machine: machine.name,
              productionOrderId: productionOrderId,
              productionUnitId: productionUnitId,
              employeeId: productionOrderMachine.employeeId,
              noOfLabours: productionOrderMachine.noOfLabours,
            });
          }
        }

        currentAllocatedLastDate = moment(currentAllocatedLastDate).add(
          1,
          "days"
        );
      }
    } else if (numberOfDays > 0) {
      machineAllocations.push({
        date: currentAllocatedLastDate,
        machineId: machine.id,
        numberOfHours: (numberOfDays * machineCapacity).toFixed(4),
        remainingHours: (
          machineCapacity -
          numberOfDays * machineCapacity
        ).toFixed(4),
        machine: machine.name,
        productionOrderId: productionOrderId,
        productionUnitId: productionUnitId,
        employeeId: productionOrderMachine.employeeId,
        noOfLabours: productionOrderMachine.noOfLabours,
      });
    }
  }

  return currentAllocatedLastDate;
};

const checkIsWorkingDay = async (nextDate, machineId) => {
  console.log(
    "###############################checkIsWorkingDay#################################"
  );

  let dayOfWeek = moment(nextDate).day();

  const machineWeekDays = await MachineWeekDays.findOne({
    where: {
      machineId: machineId,
      weekDayId: dayOfWeek,
    },
  });

  if (!machineWeekDays) {
    nextDate = moment(nextDate).add(1, "days");
    dayOfWeek = moment(nextDate).day();

    nextDate = await checkIsWorkingDay(nextDate, machineId);
  }
  return nextDate;
};

const checkBarcodeAvailable = async (barcode, initialNumber, itemMasterId) => {
  console.log(
    "###############################checkBarcodeAvailable#################################"
  );

  //Check whether barcode is already taken in OIVLs
  if (barcode && !initialNumber) {
    const existingBarcode = await OIVL.findOne({
      where: {
        barcode: barcode,
        itemMasterId: itemMasterId,
        deleted: false,
      },
    }).catch((error) => {
      console.log(error);
      throw error;
    });

    if (existingBarcode && existingBarcode.id) {
      console.log("Barcode " + barcode + " already exists.");
      throw "Barcode " + barcode + " already exists.";
    }
  }

  //Check whether barcode is already taken in OIVL Barcodes
  if (barcode && initialNumber) {
    const existingOIVLBarcode = await OIVLBarcodes.findOne({
      where: {
        barcode: barcode + initialNumber.toString(),
        itemMasterId: itemMasterId,
        deletedAt: null,
      },
    }).catch((error) => {
      console.log(error);
      throw error;
    });

    if (existingOIVLBarcode && existingOIVLBarcode.id) {
      console.log(
        "Barcode " +
          barcode +
          " " +
          initialNumber.toString() +
          " already exists."
      );
      throw (
        "Barcode " + barcode + initialNumber.toString() + " already exists."
      );
    }
  }
};

exports.getProductionPlanByCategory = async (req, res, next) => {
  let productionPlans = [],
    createdProductions = [];

  purchasePlans = [];

  try {
    const { itemCategories } = req.body;

    //Iterate through selected item categories
    for (let i = 0; i < itemCategories.length; i++) {
      let itemCategory = await ItemCategory.findOne({
        where: {
          id: itemCategories[i].id,
        },
      }).catch((e) => {
        console.log(e);
        throw e;
      });

      //Find all item masters under the category
      const itemMasters = await ItemMaster.findAll({
        where: {
          categoryId: itemCategory.id,
          deletedAt: null,
        },
      }).catch((e) => {
        console.log(e);
        throw e;
      });

      if (itemMasters && itemMasters.length > 0) {
        for (let j = 0; j < itemMasters.length; j++) {
          let item = itemMasters[j];
          let maxStock = item.maximumStock || 0;
          let committed = 0,
            onHand = 0,
            ordered = 0,
            productionQty = 0;

          let fromBillOfMaterial = false;

          //Find all warehouse items for the item
          const warehouseItems = await WarehouseItems.findAll({
            where: {
              itemMasterId: item.id,
              isDamage: false,
            },
          }).catch((e) => {
            console.log(e);
            throw e;
          });

          //Fetch total quantity
          warehouseItems.map((warehouseItem) => {
            onHand += +warehouseItem.onHand || 0;
            committed += +warehouseItem.committed || 0;
            ordered += +warehouseItem.onOrder || 0;
          });

          let requiredQty = maxStock + committed;
          let availableQty = onHand + ordered;

          productionQty = requiredQty - availableQty;

          if (productionQty > 0) {
            if (item.makeBuy == "make") {
              await generateProductionPlan(
                productionQty,
                item,
                requiredQty,
                availableQty,
                itemCategory,
                productionPlans,
                createdProductions,
                fromBillOfMaterial
              );
            } else if (item.makeBuy == "buy") {
              purchasePlans.push({
                itemMaster: item.name,
                itemMasterId: item.id,
                quantity: productionQty,
                uomId: item.inventoryUOMId,
                category: itemCategory.name,
                categoryId: itemCategory.id,
                showToUser: true,
              });
            }
          }
        }
      }
    }

    return res.status(200).send({
      productionPlans: productionPlans,
      purchasePlans: purchasePlans,
      success: true,
      message: "Success",
    });
  } catch (err) {
    console.log(err);
    return res.status(400).send({
      success: false,
      message: "Failed",
      error: err,
    });
  }
};

const generateProductionPlan = async (
  productionQty,
  itemMaster,
  requiredQty,
  availableQty,
  itemCategory,
  productionPlans,
  createdProductions,
  fromBillOfMaterial
) => {
  if (!itemMaster) return;
  let itemMasterId = itemMaster.id;

  const productionParams = {
    itemMasterId: itemMasterId,
    itemMasterCode: itemMaster.code,
    itemMasterName: itemMaster.name,
    requiredQty: requiredQty,
    availableQty: availableQty,
    productionQty: productionQty,
    itemCategory: itemCategory.name,
    categoryId: itemCategory.id,
  };

  if (createdProductions.indexOf(itemMasterId) !== -1 && fromBillOfMaterial) {
    console.log("Duplicate items found in production order!!!");
    return;
  }

  if (fromBillOfMaterial) productionParams.showToUser = false;
  else productionParams.showToUser = true;

  if (productionPlans && productionPlans.length > 0) {
    let itemExist = false;
    for (let i = 0; i < productionPlans.length; i++) {
      let productionPlan = productionPlans[i];

      if (
        productionPlan.itemMasterId &&
        +productionPlan.itemMasterId === +itemMasterId
      ) {
        // Item master already exist
        itemExist = true;
        productionPlan.requiredQty = +productionPlan.requiredQty + +requiredQty;
        productionPlan.productionQty =
          +productionPlan.productionQty + +productionQty;
      }
    }

    if (!itemExist && itemMaster.makeBuy == "make") {
      productionPlans.push(productionParams);
      createdProductions.push(+itemMasterId);
    }
  } else {
    if (itemMaster.makeBuy == "make") {
      productionPlans.push(productionParams);
      createdProductions.push(+itemMasterId);
    }
  }

  const billOfMaterial = await BillOfMaterial.findOne({
    where: {
      productId: itemMasterId,
    },
    include: [
      {
        model: BOMComponents,
      },
    ],
  }).catch((e) => {
    console.log(e);
    throw e;
  });

  //Loop through BOM Components and check whether stock is available
  if (
    billOfMaterial &&
    billOfMaterial.BOMComponents &&
    billOfMaterial.BOMComponents.length > 0
  ) {
    fromBillOfMaterial = true;

    for (let i = 0; i < billOfMaterial.BOMComponents.length; i++) {
      let item = billOfMaterial.BOMComponents[i];
      let componentRequiredQty = +item.quantityPerUnit * +productionQty;

      const oivls = await OIVL.findAll({
        where: {
          itemMasterId: item.productId,
          openQty: {
            [Op.gt]: 0,
          },
          deleted: false,
        },
      }).catch((e) => {
        console.log(e);
        throw e;
      });

      //Fetch total quantity
      let oivlAvailableQuantity = oivls
        .map((oivlObj) => +oivlObj.openQty)
        .reduce((a, b) => a + b, 0);

      if (componentRequiredQty > oivlAvailableQuantity) {
        let neededQty = componentRequiredQty - oivlAvailableQuantity;

        const bomItemMaster = await ItemMaster.findOne({
          where: {
            id: item.productId,
          },
        }).catch((e) => {
          console.log(e);
          throw e;
        });

        console.log(
          "#############################from bill of materials######################################"
        );
        if (itemMaster.makeBuy == "make") {
          await generateProductionPlan(
            neededQty,
            bomItemMaster,
            componentRequiredQty,
            oivlAvailableQuantity,
            itemCategory,
            productionPlans,
            createdProductions,
            fromBillOfMaterial
          );
        }
      }
    }
  } else {
    console.log(
      "##########################purchasePlansFromBillofMaterials#################################################"
    );
    let purchaseParams = {
      itemMaster: itemMaster.name,
      itemMasterId: itemMaster.id,
      quantity: productionQty,
      uomId: itemMaster.inventoryUOMId,
      category: itemCategory.name,
      categoryId: itemCategory.id,
    };

    if (fromBillOfMaterial) purchaseParams.showToUser = false;
    else purchaseParams.showToUser = true;

    if (itemMaster.makeBuy == "buy") {
      purchasePlans.push(purchaseParams);
    }
  }
};

exports.createProductionOrderFromCategory = async (req, res, next) => {
  let { productionPlans } = req.body;

  let { purchasePlans } = req.body;

  let { salesOrders } = req.body;

  let transaction;

  try {
    transaction = await db.sequelize.transaction().catch((e) => {
      console.log(e);
      throw e;
    });

    let missingBillOfMaterials = [];

    const salesOrderPlan = await createSalesOrderPlan(
      productionPlans,
      purchasePlans,
      salesOrders,
      transaction
    );

    if (salesOrderPlan && salesOrderPlan.id) {
      await generateProductionOrders(
        productionPlans,
        missingBillOfMaterials,
        salesOrderPlan.id,
        transaction
      );

      if (purchasePlans && purchasePlans.length > 0)
        await generatePurchases(purchasePlans, salesOrderPlan.id, transaction);
    } else throw "Failed creating Sales Order Plan";

    await transaction.commit();
    return res.status(200).send({
      success: true,
      message: "Success",
      missingBillOfMaterials: missingBillOfMaterials,
    });
  } catch (err) {
    // Rollback transaction only if the transaction object is defined
    if (transaction) await transaction.rollback();
    console.log(err);
    return res.status(400).send({
      success: false,
      message: "Failed",
      error: err,
    });
  }
};

const createSalesOrderPlan = async (
  productionPlans,
  purchasePlans,
  salesOrders,
  transaction
) => {
  const nextDocNo = await helper.getNextDocumentNumber("SOP", "BRST15");

  try {
    let params = {
      docNum: nextDocNo.nextNumber,
      series: "BRST15",
      docDate: Date.now(),
      branchId: null,
    };

    let salesOrderPlanProductions = [];
    productionPlans.forEach((item) => {
      if (item.itemMasterId) {
        salesOrderPlanProductions.push({
          itemMasterId: item.itemMasterId,
          warehouseId: item.warehouseId,
          requiredQty: item.requiredQty,
          availableQty: item.availableQty,
          productionQty: item.productionQty,
        });
      }
    });

    let salesOrderPlanPurchases = [];
    purchasePlans.forEach((item) => {
      if (item.itemMasterId) {
        salesOrderPlanPurchases.push({
          salesOrderId: item.salesOrderId,
          salesOrderItemId: item.salesOrderItemId,
          itemMasterId: item.itemMasterId,
          uomId: item.uomId,
          quantity: item.quantity,
        });
      }
    });

    params = {
      ...params,
      SalesOrderPlanProductions: salesOrderPlanProductions,
      SalesOrderPlanPurchases: salesOrderPlanPurchases,
    };

    var include = [
      {
        model: SalesOrderPlanProductions,
      },
      {
        model: SalesOrderPlanPurchases,
      },
    ];

    const salesOrderPlan = await SalesOrderPlan.create(params, {
      include: include,
      transaction: transaction,
    }).catch((e) => {
      console.log(e);
      throw e;
    });

    return salesOrderPlan;
  } catch (error) {
    throw error;
  }
};

const generateProductionOrders = async (
  productionPlans,
  missingBillOfMaterials,
  salesOrderPlanId,
  transaction
) => {
  for (let j = 0; j < productionPlans.length; j++) {
    let productionPlan = productionPlans[j];
    const productionQty = productionPlan.productionQty;
    const nextDocNo = await helper.getNextDocumentNumber("POR", "BRST12");

    const bom = await BillOfMaterial.findOne({
      where: {
        productId: productionPlan.itemMasterId,
      },
      include: [
        {
          model: BOMComponents,
        },
        {
          model: BOMLabour,
        },
        {
          model: BOMMachine,
        },
      ],
    }).catch((e) => {
      console.log(e);
      throw e;
    });

    const itemMaster = await ItemMaster.findOne({
      where: {
        id: productionPlan.itemMasterId,
      },
    }).catch((e) => {
      console.log(e);
      throw e;
    });

    let month = moment().month() + 1;
    let year = moment().year();
    let quarter = moment().quarter();

    let params = {
      docNum: nextDocNo.nextNumber,
      series: "BRST12",
      docDate: moment.now(),
      productId: productionPlan.itemMasterId,
      salesOrderId: productionPlan.salesOrderId,
      dueDate: moment.now(),
      plannedQuantity: productionQty,
      uomId: itemMaster.inventoryUOMId,
      statusId: status.planned,
      warehouseId: productionPlan.warehouseId,
      salesOrderPlanId: salesOrderPlanId,
      month: month,
      year: year,
      quarter: quarter,
    };

    let productionOrderComponents = [];
    let plannedTotalCost = 0;

    if (bom && bom.id) {
      if (bom && bom.id && bom.BOMComponents && bom.BOMComponents.length > 0) {
        for (let i = 0; i < bom.BOMComponents.length; i++) {
          let component = bom.BOMComponents[i];
          let quantity = +component.quantityPerUnit * +productionQty;
          const totalCost = +component.cost * +quantity;

          productionOrderComponents.push({
            productId: component.productId,
            quantityPerUnit: component.quantityPerUnit,
            totalQuantity: quantity,
            unitCost: component.cost,
            totalCost: totalCost,
            warehouseId: component.warehouseId,
            uomId: component.uomId,
          });

          plannedTotalCost += totalCost;
        }
      }

      let productionOrderMachines = [];
      if (bom && bom.id && bom.BOMMachines && bom.BOMMachines.length > 0) {
        for (let i = 0; i < bom.BOMMachines.length; i++) {
          let machine = bom.BOMMachines[i];
          const totalTime = +machine.estimatedTime * productionQty;
          const totalCost = +totalTime * +machine.cost;

          productionOrderMachines.push({
            machineId: machine.machineId,
            estimatedTime: machine.estimatedTime,
            costPerHour: machine.cost,
            unitCost: machine.cost,
            routingStageNumber: machine.routingStageNumber,
            routingStageId: machine.routingStageId,
            totalTime: totalTime,
            totalCost: totalCost,
          });

          plannedTotalCost += totalCost;
        }
      }

      let productionOrderLabours = [];
      if (bom && bom.id && bom.BOMLabours && bom.BOMLabours.length > 0) {
        for (let i = 0; i < bom.BOMLabours.length; i++) {
          let labour = bom.BOMLabours[i];
          const totalTime = +labour.estimatedTime * +productionQty;
          const totalCost = +totalTime * +labour.cost;

          productionOrderLabours.push({
            employeeId: labour.employeeId,
            estimatedTime: labour.estimatedTime,
            costPerHour: labour.cost,
            unitCost: labour.cost,
            totalTime: totalTime,
            totalCost: totalCost,
          });

          plannedTotalCost += totalCost;
        }
      }

      params.totalCost = plannedTotalCost;
      params.unitCost = plannedTotalCost / productionQty;

      params = {
        ...params,
        ProductionOrderComponents: productionOrderComponents,
        ProductionOrderMachines: productionOrderMachines,
        ProductionOrderLabours: productionOrderLabours,
      };

      var include = [
        {
          model: ProductionOrderComponents,
          required: true,
        },
        {
          model: ProductionOrderMachines,
          required: true,
        },
        {
          model: ProductionOrderLabours,
          required: true,
        },
      ];

      await ProductionOrder.create(params, {
        include: include,
        transaction: transaction,
      }).catch((e) => {
        console.log(e);
        throw e;
      });
    } else {
      missingBillOfMaterials.push(itemMaster.name);
    }
  }
};

const generatePurchases = async (
  purchasePlans,
  salesOrderPlanId,
  transaction
) => {
  for (let j = 0; j < purchasePlans.length; j++) {
    let purchasePlan = purchasePlans[j];

    let params = {
      salesOrderId: purchasePlan.salesOrderId,
      salesOrderItemId: purchasePlan.salesOrderItemId,
      itemMasterId: purchasePlan.itemMasterId,
      quantity: purchasePlan.quantity,
      uomId: purchasePlan.uomId,
      salesOrderPlanId: salesOrderPlanId,
    };

    await PurchasePlan.create(params, {
      transaction: transaction,
    }).catch((e) => {
      console.log(e);
      throw e;
    });
  }
};

exports.checkMachineAllocationForReschedule = async (req, res, next) => {
  const { id } = req.params;
  let reschedule = true;
  let startDate = req.query.date;
  let nextDate = req.query.date;

  let machineAllocations = [];

  const productionOrder = await ProductionOrder.findOne({
    where: {
      id: {
        [Op.eq]: id,
      },
      deleted: {
        [Op.eq]: false,
      },
    },
    include: [
      {
        model: ProductionOrderMachines,
      },
      {
        model: ProductionUnit,
      },
    ],
  }).catch((error) =>
    res.status(400).send({
      error,
      success: false,
      message: "Failed",
    })
  );

  if (productionOrder && productionOrder.ProductionOrderMachines) {
    for (let i = 0; i < productionOrder.ProductionOrderMachines.length; i++) {
      let productionOrderMachine = productionOrder.ProductionOrderMachines[i];

      nextDate = await generateMachineAllocation(
        productionOrderMachine,
        nextDate,
        machineAllocations,
        productionOrder.id,
        productionOrder.productionUnitId,
        reschedule
      );
    }

    // for (let i = 0; i < productionOrder.ProductionOrderMachines.length; i++) {
    //     let productionOrderMachine = productionOrder.ProductionOrderMachines[i]
    //     let dueDate = productionOrder.dueDate

    //     nextDate = await generateMachineAllocationForReschedule(
    //         productionOrderMachine,
    //         nextDate,
    //         machineAllocations,
    //         productionOrder.id,
    //         productionOrder.productionUnitId
    //     )
    // }

    const productionUnit = productionOrder.ProductionUnit
      ? productionOrder.ProductionUnit.name
      : "";
    let message = `All machine allocations for the Production Unit ${productionUnit} will be cancelled from starting date ${startDate}.`;

    return res.status(200).send({
      machineAllocations: machineAllocations,
      success: true,
      message: message,
      rescheduled: true,
    });
  } else {
    return res.status(400).send({
      message: "Production Order not found",
      success: false,
    });
  }
};

const generateMachineAllocationForReschedule = async (
  productionOrderMachine,
  nextDate,
  machineAllocations,
  productionOrderId,
  productionUnitId
) => {
  let currentAllocatedLastDate,
    remainingHoursOnLastDate = null;
  let remainingHours = 0;

  const machine = await MachineCenter.findOne({
    where: {
      id: productionOrderMachine.machineId,
    },
  });

  if (machine && machine.id) {
    let numberOfHours = productionOrderMachine.totalTime;
    let machineCapacity = machine.capacity || 8;

    //Check whether the nextDate is a working day for the Machine.
    nextDate = await checkIsWorkingDay(
      nextDate,
      productionOrderMachine.machineId
    );

    currentAllocatedLastDate = nextDate;

    let numberOfDays = numberOfHours / machineCapacity;

    if (numberOfDays >= 1) {
      //Loop and allocate the days
      for (let i = 0; i < Math.floor(numberOfDays); i++) {
        currentAllocatedLastDate = moment(currentAllocatedLastDate).add(
          1,
          "days"
        );

        // Get the remaining hours on the day
        if (numberOfHours <= remainingHoursOnLastDate) {
          remainingHours = machineCapacity - numberOfHours;
        } else {
          remainingHours = machineCapacity - remainingHoursOnLastDate;
        }

        machineAllocations.push({
          date: currentAllocatedLastDate,
          machineId: machine.id,
          numberOfHours: machineCapacity,
          remainingHours:
            remainingHours && remainingHours >= 0 ? remainingHours : 0,
          machine: machine.name,
          productionOrderId: productionOrderId,
          productionUnitId: productionUnitId,
        });

        //Last loop
        if (i === Math.floor(numberOfDays) - 1) {
          let partialDay = +numberOfDays - Math.floor(numberOfDays);

          if (partialDay > 0) {
            currentAllocatedLastDate = moment(currentAllocatedLastDate).add(
              1,
              "days"
            );

            machineAllocations.push({
              date: currentAllocatedLastDate,
              machineId: machine.id,
              numberOfHours: (partialDay * machineCapacity).toFixed(2),
              remainingHours: (
                machineCapacity -
                partialDay * machineCapacity
              ).toFixed(2),
              machine: machine.name,
              productionOrderId: productionOrderId,
              productionUnitId: productionUnitId,
            });
          }
        }
      }
    } else {
      currentAllocatedLastDate = moment(currentAllocatedLastDate).add(
        1,
        "days"
      );

      machineAllocations.push({
        date: currentAllocatedLastDate,
        machineId: machine.id,
        numberOfHours: (
          machineCapacity -
          numberOfDays * machineCapacity
        ).toFixed(2),
        machine: machine.name,
        productionOrderId: productionOrderId,
        productionUnitId: productionUnitId,
      });
    }
  }

  return currentAllocatedLastDate;
};

exports.reschedule = async (req, res, next) => {
  let transaction;

  try {
    let { productionOrder } = req.body;

    const productionOrderId = req.params.id;

    const machineAllocations = productionOrder.machineAllocations;

    const startDate = moment(productionOrder.date);

    transaction = await db.sequelize.transaction().catch((e) => {
      console.log(e);
      throw e;
    });

    if (!machineAllocations)
      return res.status(400).send({
        success: false,
        message: "Machine Allocations missing!",
      });

    const productionOrderObj = await ProductionOrder.findOne({
      where: {
        id: productionOrderId,
      },
    }).catch((e) => {
      console.log(e);
      throw e;
    });

    const productionUnitId =
      productionOrderObj && productionOrderObj.productionUnitId
        ? productionOrderObj.productionUnitId
        : null;

    await deleteMachineAllocations(
      productionOrderId,
      productionUnitId,
      startDate,
      transaction
    );

    machineAllocations.forEach((machineAllocation) => {
      machineAllocation.month = moment(machineAllocation.date).month() + 1;
      machineAllocation.year = moment(machineAllocation.date).year();
      machineAllocation.quarter = moment(machineAllocation.date).quarter();
    });

    await ProductionOrderMachinesAllocations.bulkCreate(machineAllocations, {
      transaction,
    }).catch((e) => {
      console.log(e);
      throw e;
    });

    await ProductionOrder.update(
      {
        statusId: status.rescheduled,
        releaseDate: startDate,
      },
      {
        where: {
          id: productionOrderId,
        },
        transaction,
      }
    ).catch((e) => {
      console.log(e);
      throw e;
    });

    // commit
    await transaction.commit();

    return res.status(200).send({
      success: true,
      message: "Production Rescheduled Successfully.",
    });
  } catch (err) {
    // Rollback transaction only if the transaction object is defined
    if (transaction) await transaction.rollback();
    console.log(err);
    return res.status(400).send({
      success: false,
      message: "Failed",
      error: err,
    });
  }
};

const deleteMachineAllocations = async (
  productionOrderId,
  productionUnitId,
  startDate,
  transaction
) => {
  //Delete existing allocations for the Production Order
  ProductionOrderMachinesAllocations.destroy({
    where: {
      productionOrderId: productionOrderId,
    },
    transaction,
  }).catch((e) => {
    console.log(e);
    throw e;
  });

  const productionOrderMachines = await ProductionOrderMachines.findAll({
    where: {
      productionOrderId: productionOrderId,
    },
    include: {
      model: MachineCenter,
    },
  }).catch((e) => {
    console.log(e);
    throw e;
  });

  const workCenterIds = productionOrderMachines.map(
    (x) => x.MachineCenter.workCenterId
  );

  //Delete existing allocations for the Production Unit after the Starting Date
  const machineAllocationsToDelete =
    await ProductionOrderMachinesAllocations.findAll({
      where: {
        productionUnitId: productionUnitId,
        date: {
          [Op.gte]: startDate,
        },
      },
      include: {
        model: MachineCenter,
        where: {
          workCenterId: {
            [Op.in]: workCenterIds,
          },
        },
        required: true,
      },
    }).catch((e) => {
      console.log(e);
      throw e;
    });

  // Delete the items which is removed by user
  for (machineAllocationToDelete of machineAllocationsToDelete) {
    await machineAllocationToDelete
      .destroy({
        transaction,
      })
      .catch((error) => {
        console.log(error);
        throw error;
      });
  }
};
