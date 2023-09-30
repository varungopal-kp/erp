const Sequelize = require("sequelize")
const Op = Sequelize.Op
const _ = require("lodash")
const moment = require("moment")
const paginate = require("express-paginate")

const db = require("../models/index")
const {
  getNextDocumentNumber,
  getConvertedPrice,
} = require("../helpers/helper")
const { validateInputs } = require("../helpers/validate")
const status = require("../config/status")
const validationAttributes =
  require("../config/validation-attributes.json").slittingPlan

exports.create = async (req, res, next) => {
  const { slittingPlan } = req.body
  const { SlittingPlanItems } = slittingPlan

  let transaction = await db.sequelize.transaction().catch((e) => {
    console.log(e)
    throw e
  })

  try {
    if (req.headers.user) slittingPlan.createdUser = req.headers.user

    const nextDocNo = await getNextDocumentNumber("SLP", slittingPlan.series)

    if (nextDocNo) slittingPlan.docNum = nextDocNo.nextNumber

    slittingPlan.status = "open"

    let month = moment(slittingPlan.docDate).month() + 1
    let year = moment(slittingPlan.docDate).year()
    let quarter = moment(slittingPlan.docDate).quarter()

    slittingPlan.month = month
    slittingPlan.year = year
    slittingPlan.quarter = quarter

    const newSlittingPlan = await db.SlittingPlan.create(slittingPlan, {
      transaction,
    }).catch((e) => {
      console.log(e)
      throw e
    })

    await insertSlittingPlanItems(
      SlittingPlanItems,
      newSlittingPlan,
      req,
      transaction
    )

    await transaction.commit()

    return res.status(200).send({
      slittingPlan: newSlittingPlan,
      success: true,
      message: "Success",
    })
  } catch (error) {
    // Rollback transaction only if the transaction object is defined
    if (transaction) await transaction.rollback()

    console.log(error)
    return res.status(400).send({
      success: false,
      message: "Failed",
      error: error && error.message ? error.message : error,
    })
  }
}

exports.list = async (req, res, next) => {
  var filter = []
  var include = [
    {
      model: db.Branch,
      attributes: ["id", "code", "name"],
    },
    {
      model: db.ProductionUnit,
      attributes: ["id", "code", "name"],
    },
    {
      model: db.Warehouse,
      attributes: ["id", "code", "name"],
    },
  ]

  if (req.query.hasOwnProperty("all")) {
    return res.send({
      salesOrders: await db.SlittingPlan.findAll({
        include,
        where: {
          deleted: false,
          // statusId: {
          //     [Op.ne]: status.closed
          // }
        },
      }),
    })
  }

  if (req.query.filtered != undefined) {
    req.query.filtered = JSON.stringify(req.query.filtered)

    var filtered = JSON.parse(req.query.filtered)
    for (var i = 0; i < filtered.length; i++) {
      filtered[i] = JSON.parse(filtered[i])
    }

    filter = filtered.map((data) => {
      if (data.param == "statusId") {
        return {
          [data.param]: {
            [Op.eq]: data.value,
          },
        }
      } else {
        return {
          [data.param]: {
            [Op.iLike]: `${data.value}%`,
          },
        }
      }
    })
  }

  filter.push({
    deleted: false,
  })

  await db.SlittingPlan.findAndCountAll({
    include,
    distinct: true,
    limit: req.query.limit,
    offset: req.skip,
    where: filter,
    order: [["id", "DESC"]],
  })
    .then(async (results) => {
      const itemCount = results.count
      const pageCount = Math.ceil(results.count / req.query.limit)

      return res.send({
        slittingPlans: results.rows,
        pageCount,
        itemCount,
        pages: paginate.getArrayPages(req)(3, pageCount, req.query.page),
      })
    })
    .catch((error) => {
      return res.status(400).send({
        error: error,
      })
    })
}

exports.getOne = async (req, res, next) => {
  const { id } = req.params

  let filter = []
  let include = [
    {
      model: db.SlittingPlanItems,
      attributes: [
        "id",
        "width",
        "thickness",
        "coilWeight",
        "widthConsumed",
        "scrapWeight",
        "oivlId",
        "itemMasterId",
      ],
      include: [
        {
          model: db.ItemMaster,
          attributes: ["id", "code", "name"],
        },
        {
          model: db.OIVL,
          attributes: ["id", "barcode", "openQty"],
        },
        {
          model: db.SlittingPlanItemDetails,
          attributes: ["id", "itemMasterId"],
          include: {
            model: db.ItemMaster,
            attributes: ["id", "code", "name"],
          },
        },
      ],
    },
    {
      model: db.Branch,
      attributes: ["id", "code", "name"],
    },
    {
      model: db.ProductionUnit,
      attributes: ["id", "code", "name"],
    },
    {
      model: db.Warehouse,
      attributes: ["id", "code", "name"],
    },
    {
      model: db.SlittingOrder,
      attributes: ["id", "docNum", "series"],
      include: [
        {
          model: db.ItemMaster,
          attributes: ["id", "code", "name"],
        },
        {
          model: db.OIVL,
          attributes: ["id", "barcode", "openQty"],
        },
      ],
    },
  ]

  filter.push({
    id,
    deleted: false,
    deletedAt: null,
  })

  await db.SlittingPlan.findOne({
    include,
    where: filter,
  })
    .then(async (result) => {
      if (!result) {
        return res.status(400).send({
          success: false,
          message: "Record not found",
        })
      }

      return res.send({
        slittingPlan: result,
        success: true,
        message: "Success",
      })
    })
    .catch((error) => {
      console.log(error)
      return res.status(400).send({
        error,
        success: false,
        message: "Action Failed",
      })
    })
}

exports.destroy = async (req, res, next) => {
  let transaction = await db.sequelize.transaction().catch((e) => {
    console.log(e)
    throw e
  })

  try {
    const { id } = req.params

    const slittingPlan = await db.SlittingPlan.findOne({
      where: {
        id,
        deleted: false,
      },
      include: {
        model: db.SlittingPlanItems,
        attributes: ["id", "oivlId", "coilWeight"],
      },
      transaction,
    }).catch((error) => {
      console.log(error)
      throw error
    })

    if (!slittingPlan || !slittingPlan.SlittingPlanItems) {
      return res.status(404).send({
        message: "record Not Found",
        success: false,
      })
    }

    await slittingPlan
      .update(
        {
          deleted: true,
          deletedAt: new Date(),
        },
        {
          transaction,
        }
      )
      .catch((error) => {
        console.log(error)
        throw error
      })

    await deleteSlittingPlanItems(slittingPlan.SlittingPlanItems, transaction)

    await db.SlittingOrder.destroy({
      where: {
        slittingPlanId: id,
      },
      transaction,
    }).catch((error) => {
      throw error
    })

    await transaction.commit()

    return res.status(204).send({
      message: "Deleted Successfully.",
      success: true,
    })
  } catch (error) {
    // Rollback transaction only if the transaction object is defined
    if (transaction) await transaction.rollback()

    console.log(error)
    return res.status(400).send({
      success: false,
      message: "Failed",
      error: error && error.message ? error.message : error,
    })
  }
}

// Validate input parameters
exports.validate = async (req, res, next) => {
  let { slittingPlan } = req.body

  const inputValidation = await validateInputs(
    slittingPlan,
    validationAttributes
  )

  if (!inputValidation.success) {
    return res.status(401).send({
      success: false,
      message: inputValidation.message,
      error: inputValidation.errors,
    })
  }
  next()
}

const insertSlittingPlanItems = async (
  slittingPlanItems,
  slittingPlan,
  req,
  transaction
) => {
  console.log(
    "########################## insertSlittingPlanItems ##############################"
  )
  for (let i = 0; i < slittingPlanItems.length; i++) {
    const lineItem = slittingPlanItems[i]
    lineItem.slittingPlanId = slittingPlan.id

    const slittingPlanItem = await db.SlittingPlanItems.create(lineItem, {
      transaction,
    }).catch((e) => {
      throw e
    })

    await updateOIVL(lineItem.oivlId, transaction)

    await insertSlittingPlanItemDetails(
      lineItem.SlittingPlanItemDetails,
      slittingPlan.id,
      slittingPlanItem.id,
      transaction
    )

    const slittingOrderParams = {
      slittingPlanId: slittingPlan.id,
      docDate: slittingPlan.docDate,
      startDate: slittingPlan.startingDate,
      endDate: slittingPlan.endDate,
      branchId: slittingPlan.branchId,
      productionUnitId: slittingPlan.productionUnitId,
      warehouseId: slittingPlan.warehouseId,
      remarks: slittingPlan.remarks,
      productId: lineItem.itemMasterId,
      oivlId: lineItem.oivlId,
      width: lineItem.width,
      thickness: lineItem.thickness,
      coilWeight: lineItem.coilWeight,
      widthConsumed: lineItem.widthConsumed,
      scrapWeight: lineItem.scrapWeight,
    }

    await createSlittingOrder(
      req,
      slittingOrderParams,
      lineItem.SlittingPlanItemDetails,
      lineItem.coilWeight,
      lineItem.width,
      transaction
    )
  }
}

const updateOIVL = async (oivlId, transaction) => {
  console.log(
    "########################## updateOIVL ##############################"
  )

  const oivl = await db.OIVL.findOne({
    where: {
      id: oivlId,
      openQty: {
        [Op.gt]: 0,
      },
    },
    transaction,
  }).catch((e) => {
    throw e
  })

  if (!oivl) throw new Error("Coil Number/Batch not found!")

  await oivl
    .update(
      {
        outQty: oivl.inQty,
        openQty: 0,
      },
      {
        transaction,
      }
    )
    .catch((e) => {
      throw e
    })
}

const insertSlittingPlanItemDetails = async (
  slittingPlanItemDetails,
  slittingPlanId,
  slittingPlanItemId,
  transaction
) => {
  console.log(
    "########################## insertSlittingPlanItemDetails ##############################"
  )

  for (let i = 0; i < slittingPlanItemDetails.length; i++) {
    const lineItem = slittingPlanItemDetails[i]
    lineItem.slittingPlanId = slittingPlanId
    lineItem.slittingPlanItemId = slittingPlanItemId

    await db.SlittingPlanItemDetails.create(lineItem, {
      transaction,
    }).catch((e) => {
      throw e
    })
  }
}

const deleteSlittingPlanItems = async (slittingPlanItems, transaction) => {
  console.log(
    "########################## deleteSlittingPlanItems ##############################"
  )
  for (let i = 0; i < slittingPlanItems.length; i++) {
    const lineItem = slittingPlanItems[i]

    await db.SlittingPlanItems.destroy({
      where: {
        id: lineItem.id,
      },
      transaction,
    }).catch((e) => {
      throw e
    })

    const oivl = await db.OIVL.findOne({
      where: {
        id: lineItem.oivlId,
      },
      transaction,
    }).catch((e) => {
      throw e
    })

    if (!oivl) throw new Error("OIVL not found")

    // Update the OIVL
    await oivl
      .update(
        {
          openQty: lineItem.coilWeight,
          outQty: +oivl.outQty - +lineItem.coilWeight,
        },
        {
          transaction,
        }
      )
      .catch((e) => {
        throw e
      })
  }
}

const createSlittingOrder = async (
  req,
  headerParams,
  items,
  parentCoilWeight,
  parentCoilWidth,
  transaction
) => {
  console.log(
    "########################## createSlittingOrder ##############################"
  )

  const slittingOrder = {
    status: "open",
    ...headerParams,
  }

  if (req.headers.user) slittingOrder.createdUser = req.headers.user

  const nextDocNo = await getNextDocumentNumber("SLOR")

  if (nextDocNo) {
    slittingOrder.docNum = nextDocNo.nextNumber
    slittingOrder.series = nextDocNo.series
  }

  let month = moment(headerParams.docDate).month() + 1
  let year = moment(headerParams.docDate).year()
  let quarter = moment(headerParams.docDate).quarter()

  slittingOrder.month = month
  slittingOrder.year = year
  slittingOrder.quarter = quarter

  const newSlittingOrder = await db.SlittingOrder.create(slittingOrder, {
    transaction,
  }).catch((e) => {
    console.log(e)
    throw e
  })

  const parentItem = await db.ItemMaster.findOne({
    where: {
      id: headerParams.productId,
    },
    transaction,
    attributes: ["materialId"],
  }).catch((e) => {
    throw e
  })

  // correctionFactor is 10 for MS Coils(id=1 hard coded) and 5 for all other materials
  let correctionFactor = 5

  if (parentItem && parentItem.materialId === 1) correctionFactor = 10

  await insertSlittingOrderItems(
    items,
    newSlittingOrder,
    parentCoilWeight,
    parentCoilWidth,
    correctionFactor,
    transaction
  )
}

const insertSlittingOrderItems = async (
  slittingOrderItems,
  slittingOrder,
  parentCoilWeight,
  parentCoilWidth,
  correctionFactor,
  transaction
) => {
  console.log(
    "########################## insertSlittingOrderItems ##############################"
  )

  const counts = {}
  const refinedItems = []

  // Get the UOM information for Pieces
  const uom = await db.UOM.findOne({
    where: {
      code: "pcs",
    },
  })

  // Refine the Items
  for (let i = 0; i < slittingOrderItems.length; i++) {
    const slittingOrderItem = slittingOrderItems[i]

    // Get the counts in to the counts object and the unique array to refinedItems
    if (!counts[slittingOrderItem.itemMasterId]) {
      counts[slittingOrderItem.itemMasterId] = 1

      if (slittingOrderItem.itemMasterId)
        refinedItems.push({
          itemMasterId: slittingOrderItem.itemMasterId,
        })
    } else counts[slittingOrderItem.itemMasterId]++
  }

  for (let i = 0; i < refinedItems.length; i++) {
    const lineItem = refinedItems[i]
    lineItem.slittingOrderId = slittingOrder.id
    lineItem.quantity = counts[lineItem.itemMasterId]
    lineItem.uomId = uom.id

    // Fetch the bill of material price
    const bom = await db.BillOfMaterials.findOne({
      where: {
        productId: lineItem.itemMasterId,
      },
      transaction,
      include: [
        {
          model: db.BOMMachines,
        },
        {
          model: db.BOMLabours,
        },
      ],
    }).catch((e) => {
      throw e
    })

    const itemMaster = await db.ItemMaster.findOne({
      where: {
        id: lineItem.itemMasterId,
      },
      transaction,
      attributes: ["width"],
    }).catch((e) => {
      throw e
    })

    if (!itemMaster.width)
      throw new Error("Item master does not have a width defined.")

    // Calculate the weight per piece
    const weightPerPiece = parseFloat(
      (+parentCoilWeight / (+parentCoilWidth + +correctionFactor)) *
        itemMaster.width
    ).toFixed(4)

    // Convert the price to pieces
    if (bom && bom.totalCostInBaseUnit) {
      lineItem.price = +bom.totalCostInBaseUnit || 0

      // lineItem.price = await convertInventoryPriceToPieces(
      // 	lineItem.itemMasterId,
      // 	lineItem.slittingOrderId,
      // 	bom.totalCostInBaseUnit,
      // 	lineItem.quantity,
      // 	transaction
      // );

      lineItem.total = parseFloat(
        +lineItem.quantity * +lineItem.price * weightPerPiece
      ).toFixed(4)
    }

    lineItem.weightPerPiece = weightPerPiece

    await db.SlittingOrderItem.create(lineItem, {
      transaction,
    }).catch((e) => {
      throw e
    })

    if (bom && bom.BOMMachines && bom.BOMMachines.length) {
      await insertSlittingOrderMachines(
        bom.BOMMachines,
        slittingOrder.id,
        slittingOrder.startDate,
        slittingOrder.endDate,
        transaction
      )
    }

    if (bom && bom.BOMLabours && bom.BOMLabours.length) {
      await insertSlittingOrderLabours(
        bom.BOMLabours,
        slittingOrder.id,
        slittingOrder.startDate,
        slittingOrder.endDate,
        transaction
      )
    }
  }
}

const convertInventoryPriceToCustomUnit = async (
  itemMasterId,
  price,
  unitCode
) => {
  console.log(
    "################################# convertInventoryPriceToCustomUnit #######################"
  )

  const itemMaster = await db.ItemMaster.findOne({
    where: {
      id: itemMasterId,
    },
    attributes: ["inventoryUOMId", "name"],
  }).catch((error) => {
    console.log(error)
    throw error
  })

  const uom = await db.UOM.findOne({
    where: {
      code: unitCode,
    },
  }).catch((error) => {
    throw error
  })

  if (uom.id === itemMaster.inventoryUOMId) return price

  const itemMasterUOM = await db.ItemMasterUOMs.findOne({
    where: {
      itemMasterId,
      uomId: uom.id,
    },
  }).catch((error) => {
    console.log(error)
    throw error
  })

  if (!itemMasterUOM)
    throw new Error(
      `${uom.name} is not associated with ${itemMaster.name}! Please add it in the item master under inventory.`
    )

  let conversionFactor =
    itemMasterUOM.conversionFactor && itemMasterUOM.conversionFactor > 0
      ? itemMasterUOM.conversionFactor
      : 1

  return parseFloat(+price * +conversionFactor).toFixed(4)
}

const convertInventoryPriceToPieces = async (
  productId,
  slittingOrderId,
  price,
  quantity,
  transaction
) => {
  console.log(
    "################################# convertInventoryPriceToPieces #######################"
  )

  const itemMaster = await db.ItemMaster.findOne({
    where: {
      id: productId,
    },
    transaction,
    attributes: ["width"],
  }).catch((e) => {
    throw e
  })

  const slittingOrder = await db.SlittingOrder.findOne({
    where: {
      id: slittingOrderId,
    },
    transaction,
    attributes: ["productId", "oivlId", "width", "coilWeight"],
  }).catch((e) => {
    throw e
  })

  const coilWeight = slittingOrder.coilWeight
  const totalWidth = slittingOrder.width
  const semiFinishedWidth = itemMaster.width

  // Calculating the weight of the slitted coil piece
  const quantityInMT = parseFloat(
    (coilWeight / totalWidth) * semiFinishedWidth
  ).toFixed(4)

  const priceInPiece = parseFloat(quantity * quantityInMT * price).toFixed(4)

  console.log("priceInPiece", priceInPiece)

  return priceInPiece
}

const insertSlittingOrderMachines = async (
  machines,
  slittingOrderId,
  startDate,
  endDate,
  transaction
) => {
  console.log(
    "###########################insertSlittingOrderMachines###############################"
  )

  for (let i = 0; i < machines.length; i++) {
    const item = machines[i]
    var inputParams = {
      routingStageNumber: item.routingStageNumber,
      routingStageId: item.routingStageId,
      machineId: item.machineId,
      estimatedTime: item.estimatedTime,
      startDate,
      endDate,
      totalCost: parseFloat(item.cost * item.estimatedTime).toFixed(4),
      costPerHour: item.cost,
      remarks: item.remarks,
      hoursInBaseUnit: item.hoursInBaseUnit,
      costInBaseUnit: item.costInBaseUnit,
      noOfLabours: parseInt(item.noOfLabours),
    }

    inputParams.slittingOrderId = slittingOrderId

    await db.SlittingOrderMachine.create(inputParams, {
      transaction,
    }).catch((e) => {
      console.log(e)
      throw e
    })
  }
}

const insertSlittingOrderLabours = async (
  labours,
  slittingOrderId,
  startDate,
  endDate,
  transaction
) => {
  console.log(
    "###########################insertSlittingOrderLabours###############################"
  )

  for (let i = 0; i < labours.length; i++) {
    const item = labours[i]
    var inputParams = {
      employeeId: item.employeeId,
      estimatedTime: item.estimatedTime,
      startDate,
      endDate,
      totalCost: parseFloat(item.cost * item.estimatedTime).toFixed(4),
      costPerHour: item.cost,
      remarks: item.remarks,
      hoursInBaseUnit: item.hoursInBaseUnit,
      costInBaseUnit: item.costInBaseUnit,
    }

    inputParams.slittingOrderId = slittingOrderId

    await db.SlittingOrderLabour.create(inputParams, {
      transaction,
    }).catch((e) => {
      console.log(e)
      throw e
    })
  }
}
