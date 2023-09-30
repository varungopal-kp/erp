const Sequelize = require("sequelize")
const Op = Sequelize.Op
const moment = require("moment")
const db = require("../models/index")
const paginate = require("express-paginate")

const { getNextDocumentNumber } = require("../helpers/helper")
const { validateInputs } = require("../helpers/validate")
const validationAttributes =
  require("../config/validation-attributes.json").slittingReceipt
const {
  getConvertedQuantity,
  getConvertedPrice,
  createProductionOrderLog,
} = require("../helpers/helper")

exports.create = async (req, res, next) => {
  const { slittingReceipt } = req.body
  const { SlittingReceiptItems } = slittingReceipt

  let transaction = await db.sequelize.transaction().catch((e) => {
    console.log(e)
    throw e
  })

  try {
    if (req.headers.user) slittingReceipt.createdUser = req.headers.user

    const nextDocNo = await getNextDocumentNumber(
      "SLRT",
      slittingReceipt.series
    )

    if (nextDocNo) slittingReceipt.docNum = nextDocNo.nextNumber

    slittingReceipt.status = "open"

    let month = moment(slittingReceipt.docDate).month() + 1
    let year = moment(slittingReceipt.docDate).year()
    let quarter = moment(slittingReceipt.docDate).quarter()

    slittingReceipt.month = month
    slittingReceipt.year = year
    slittingReceipt.quarter = quarter

    const newSlittingReceipt = await db.SlittingReceipt.create(
      slittingReceipt,
      {
        transaction,
      }
    ).catch((e) => {
      console.log(e)
      throw e
    })

    await insertSlittingReceiptItems(
      SlittingReceiptItems,
      newSlittingReceipt,
      transaction
    )

    await transaction.commit()

    return res.status(200).send({
      slittingReceipt: newSlittingReceipt,
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
      model: db.SlittingOrder,
      attributes: ["id", "series", "docNum"],
    },
  ]

  if (req.query.hasOwnProperty("all")) {
    return res.send({
      slittingReceipts: await db.SlittingReceipt.findAll({
        include,
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

  await db.SlittingReceipt.findAndCountAll({
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
        slittingReceipts: results.rows,
        pageCount,
        itemCount,
        pages: paginate.getArrayPages(req)(3, pageCount, req.query.page),
      })
    })
    .catch((error) => {
      console.log(error)
      return res.status(400).send({
        error: error,
      })
    })
}

exports.destroy = async (req, res, next) => {
  const { id } = req.params

  let transaction = await db.sequelize.transaction().catch((e) => {
    console.log(e)
    throw e
  })

  try {
    const slittingReceipt = await db.SlittingReceipt.findOne({
      where: {
        id,
      },
    }).catch((error) => {
      throw error
    })

    if (!slittingReceipt) {
      return res.status(404).send({
        message: "record Not Found",
        success: false,
      })
    }

    await slittingReceipt
      .destroy({
        transaction,
      })
      .catch((error) => {
        console.log(error)
        throw error
      })

    await deleteOIVLs(slittingReceipt, transaction)

    await deleteSlittingReceiptOIVLs(id, transaction)

    await updateWarehouseItemsOnDelete(
      id,
      slittingReceipt.slittingOrderId,
      transaction
    )

    // commit
    await transaction.commit()

    return res.status(202).send({
      message: "Deleted Successfully.",
      success: true,
    })
  } catch (err) {
    // Rollback transaction only if the transaction object is defined
    if (transaction) await transaction.rollback()
    console.log(err)
    return res.status(400).send({
      success: false,
      message: "Failed",
      error: err && err.message ? err.message : err,
    })
  }
}

exports.getOne = async (req, res, next) => {
  const { id } = req.params

  let filter = []
  let include = [
    {
      model: db.SlittingReceiptItem,
      attributes: [
        "id",
        "productId",
        "warehouseId",
        "quantity",
        "uomId",
        "price",
        "total",
      ],
      include: [
        {
          model: db.ItemMaster,
          attributes: [
            "id",
            "code",
            "name",
            "managementTypeId",
            "inventoryUOMId",
          ],
        },
        {
          model: db.UOM,
          attributes: ["id", "code", "name"],
        },
        {
          model: db.Warehouse,
          attributes: ["id", "code", "name"],
        },
      ],
    },
    {
      model: db.Branch,
      attributes: ["id", "code", "name"],
    },
    {
      model: db.SlittingOrder,
      attributes: ["id", "series", "docNum"],
    },
  ]

  filter.push({
    id,
  })

  await db.SlittingReceipt.findOne({
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
        slittingReceipt: result,
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

exports.validate = async (req, res, next) => {
  let { slittingReceipt } = req.body

  const inputValidation = await validateInputs(
    slittingReceipt,
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

const insertSlittingReceiptItems = async (
  slittingReceiptItems,
  slittingReceipt,
  transaction
) => {
  console.log(
    "########################## insertSlittingReceiptItems ##############################"
  )

  for (let i = 0; i < slittingReceiptItems.length; i++) {
    const lineItem = slittingReceiptItems[i]
    lineItem.slittingReceiptId = slittingReceipt.id

    const slittingReceiptItemId = await db.SlittingReceiptItem.create(
      lineItem,
      {
        transaction,
      }
    ).catch((e) => {
      throw e
    })

    await addOIVLData(
      slittingReceipt,
      lineItem,
      slittingReceiptItemId,
      transaction
    )

    await updateWarehouseItemPrice(
      lineItem,
      slittingReceipt.slittingOrderId,
      transaction
    )
  }
}

const addOIVLData = async (
  slittingReceipt,
  lineItem,
  slittingReceiptItemId,
  transaction
) => {
  console.log(
    "####################################addOIVLData#########################"
  )
  const itemMaster = await db.ItemMaster.findOne({
    where: {
      id: lineItem.productId,
    },
  })

  if (!itemMaster) throw new Error("Item master not found!")

  switch (itemMaster.managementTypeId) {
    case 1: // Management type is NONE
      await addOIVLWhenNoManagementType(
        slittingReceipt,
        lineItem,
        itemMaster,
        transaction
      )
      break
    case 2: // Management type is BATCH WISE
      await addOIVLWhenBatch(
        slittingReceipt,
        lineItem,
        slittingReceiptItemId,
        itemMaster,
        transaction
      )
      break

    default:
      await addOIVLWhenNoManagementType(
        slittingReceipt,
        lineItem,
        itemMaster,
        transaction
      )
      break
  }
}

const addOIVLWhenNoManagementType = async (
  slittingReceipt,
  item,
  itemMaster,
  transaction
) => {
  console.log(
    "####################################addOIVLWhenNoManagementType#########################"
  )

  let barcode = parseInt(itemMaster.latestBarcode) + 1

  let quantityInBaseUnit = await convertQtyToBaseUnit(
    item.uomId,
    item.productId,
    item.quantity,
    slittingReceipt.slittingOrderId,
    transaction
  )

  let priceInBaseUnit = 0

  if (itemMaster.typeId != 2)
    priceInBaseUnit = await getConvertedPrice(
      item.uomId,
      item.productId,
      item.price
    )
  else {
    priceInBaseUnit = await convertInventoryPriceToPieces(
      item.productId,
      slittingReceipt.slittingOrderId,
      item.price,
      item.quantity,
      transaction
    )
  }

  // Create a new OIVL
  let data = {
    docNum: slittingReceipt.docNum,
    docDate: slittingReceipt.docDate,
    docType: "SLRT",
    documentId: slittingReceipt.id,
    itemMasterId: item.productId,
    warehouseId: item.warehouseId,
    inQty: quantityInBaseUnit,
    openQty: quantityInBaseUnit,
    barcode: itemMaster.code.trim() + barcode.toString(),
    price: priceInBaseUnit,
  }

  const existingOIVLBarcode = await db.OIVL.findOne({
    where: {
      barcode: data.barcode,
      itemMasterId: item.productId,
      deleted: false,
    },
  }).catch((error) => {
    console.log(error)
    throw error
  })

  if (existingOIVLBarcode && existingOIVLBarcode.id) {
    console.log("Barcode " + data.barcode + " already exists.")
    throw new Error("Barcode " + data.barcode + " already exists.")
  }

  const createdOIVL = await db.OIVL.create(data, {
    transaction,
  }).catch((e) => {
    console.log(e)
    throw e
  })

  //Insert Slitting Receipt OIVLs
  await db.SlittingReceiptOIVL.create(
    {
      slittingReceiptId: slittingReceipt.id,
      oivlId: createdOIVL.id,
      quantity: item.quantity,
    },
    {
      transaction,
    }
  ).catch((e) => {
    console.log(e)
    throw e
  })

  //Update latest barcode
  await itemMaster
    .update(
      {
        latestBarcode: barcode,
      },
      {
        transaction,
      }
    )
    .catch((e) => {
      console.log(e)
      throw e
    })
}

const addOIVLWhenBatch = async (
  slittingReceipt,
  lineItem,
  slittingReceiptItemId,
  itemMaster,
  transaction
) => {
  console.log(
    "####################################addOIVLWhenBatch#########################"
  )

  if (lineItem && lineItem.OIVLs && lineItem.OIVLs.length > 0) {
    for (let i = 0; i < lineItem.OIVLs.length; i++) {
      const selectedOIVL = lineItem.OIVLs[i]

      let quantityInBaseUnit = await convertQtyToBaseUnit(
        lineItem.uomId,
        lineItem.productId,
        selectedOIVL.quantity,
        slittingReceipt.slittingOrderId,
        transaction
      )

      const existingOIVL = await db.OIVL.findOne({
        where: {
          barcode: selectedOIVL.barcode,
          itemMasterId: lineItem.productId,
          warehouseId: lineItem.warehouseId,
          deleted: false,
        },
      }).catch((error) => {
        console.log(error)
        throw error
      })

      if (existingOIVL && existingOIVL.id) {
        console.log("Barcode " + selectedOIVL.barcode + " already exists.")

        await updateExistingOIVL({
          existingOIVL,
          quantityInBaseUnit,
          bundleNumbers: selectedOIVL.OIVLBundleNumbers,
          slittingReceiptId: slittingReceipt.id,
          productionOrderId: slittingReceipt.productionOrderId,
          uomId: lineItem.uomId,
          productId: lineItem.productId,
          slittingReceiptItemId,
          transaction,
        })

        //Insert Production Receipt OIVLs
        await db.SlittingReceiptOIVL.create(
          {
            slittingReceiptId: slittingReceipt.id,
            oivlId: existingOIVL.id,
            quantity: selectedOIVL.quantity,
          },
          {
            transaction,
          }
        ).catch((e) => {
          console.log(e)
          throw e
        })
      } else {
        let priceInBaseUnit = 0

        if (itemMaster.typeId != 2)
          priceInBaseUnit = await getConvertedPrice(
            lineItem.uomId,
            lineItem.productId,
            lineItem.price
          )
        else {
          priceInBaseUnit = await convertInventoryPriceToPieces(
            lineItem.productId,
            slittingReceipt.slittingOrderId,
            lineItem.price,
            lineItem.quantity,
            transaction
          )
        }

        let data = {
          docNum: slittingReceipt.docNum,
          docDate: slittingReceipt.docDate,
          docType: "SLRT",
          documentId: slittingReceipt.id,
          itemMasterId: lineItem.productId,
          warehouseId: lineItem.warehouseId,
          inQty: quantityInBaseUnit,
          openQty: quantityInBaseUnit,
          barcode: selectedOIVL.barcode,
          price: priceInBaseUnit || lineItem.price,
        }

        const createdOIVL = await db.OIVL.create(data, {
          // include: include,
          transaction: transaction,
        }).catch((e) => {
          console.log(e)
          throw e
        })

        // await updateExistingOIVL({
        // 	existingOIVL: createdOIVL,
        // 	quantityInBaseUnit,
        // 	bundleNumbers: selectedOIVL.OIVLBundleNumbers,
        // 	slittingReceiptId: slittingReceipt.id,
        // 	productionOrderId: slittingReceipt.productionOrderId,
        // 	uomId: lineItem.uomId,
        // 	productId: lineItem.productId,
        // 	slittingReceiptItemId,
        // 	transaction
        // });

        //Insert Production Receipt OIVLs
        await db.SlittingReceiptOIVL.create(
          {
            slittingReceiptId: slittingReceipt.id,
            oivlId: createdOIVL.id,
            quantity: selectedOIVL.quantity,
          },
          {
            transaction,
          }
        ).catch((e) => {
          console.log(e)
          throw e
        })
      }
    }
  } else {
    console.log("No OIVLs selected for an Item which is batch wise managed")
    throw new Error("No OIVLs selected for an Item which is batch wise managed")
  }
}

const updateExistingOIVL = async ({
  existingOIVL,
  quantityInBaseUnit,
  transaction,
}) => {
  console.log(
    "####################################updateExistingOIVL#########################"
  )

  //Update OIVL quantities
  await existingOIVL
    .increment(
      {
        inQty: quantityInBaseUnit,
        openQty: quantityInBaseUnit,
      },
      {
        transaction,
      }
    )
    .catch((e) => {
      console.log(e)
      throw e
    })
}

const updateWarehouseItemPrice = async (
  lineItem,
  slittingOrderId,
  transaction
) => {
  console.log(
    "######################updateWarehouseItemPrice###########################"
  )
  let price = 0

  let itemMaster = await db.ItemMaster.findOne({
    where: {
      id: lineItem.productId,
    },
  }).catch((e) => {
    console.log(e)
    throw e
  })

  // let convertedReceiptQuantity = await getConvertedQuantity(lineItem.uomId, lineItem.productId, lineItem.quantity);

  let convertedReceiptQuantity = await convertQtyToBaseUnit(
    lineItem.uomId,
    lineItem.productId,
    lineItem.quantity,
    slittingOrderId,
    transaction
  )

  let priceInBaseUnit = 0 //await getConvertedPrice(lineItem.uomId, lineItem.productId, lineItem.unitCost);

  if (itemMaster.typeId != 2)
    priceInBaseUnit = await getConvertedPrice(
      lineItem.uomId,
      lineItem.productId,
      lineItem.price
    )
  else {
    priceInBaseUnit = await convertInventoryPriceToPieces(
      lineItem.productId,
      slittingOrderId,
      lineItem.price,
      lineItem.quantity,
      transaction
    )
  }

  if (itemMaster) {
    let oivls = []

    const warehouseItem = await db.WarehouseItems.findOne({
      where: {
        itemMasterId: lineItem.productId,
        warehouseId: lineItem.warehouseId,
      },
      transaction,
    }).catch((e) => {
      console.log(e)
      throw e
    })

    if (itemMaster.valuationMethod == "m") {
      // Moving Average
      oivls = await db.OIVL.findAll({
        where: {
          itemMasterId: lineItem.productId,
          warehouseId: lineItem.warehouseId,
          openQty: {
            [Op.gt]: 0,
          },
          deleted: false,
        },
        transaction,
      }).catch((e) => {
        console.log(e)
        throw e
      })

      //Fetch total quantity
      let oivlTotalOpenQty = oivls
        .map((oivlObj) => +oivlObj.openQty)
        .reduce((a, b) => a + b, 0)

      oivlTotalOpenQty = +oivlTotalOpenQty + +convertedReceiptQuantity

      //Fetch total price
      price = oivls
        .map((oivlObj) => {
          return oivlObj.openQty * oivlObj.price
        })
        .reduce((a, b) => a + b, 0)

      price += convertedReceiptQuantity * +priceInBaseUnit

      //Calculate average price
      price = (price / oivlTotalOpenQty).toFixed(4)

      if (warehouseItem) {
        await warehouseItem
          .update(
            {
              price: price && price != 0 ? price : lineItem.unitCost,
            },
            {
              transaction,
            }
          )
          .catch((e) => {
            console.log(e)
            throw e
          })

        await warehouseItem
          .increment(
            {
              onHand: convertedReceiptQuantity,
            },
            {
              transaction,
            }
          )
          .catch((e) => {
            console.log(e)
            throw e
          })
      } else {
        let warehouseItemData = {
          itemMasterId: lineItem.productId,
          warehouseId: lineItem.warehouseId,
          price: price && price != 0 ? price : lineItem.unitCost,
          onHand: convertedReceiptQuantity,
        }

        await db.WarehouseItems.create(warehouseItemData, {
          transaction,
        }).catch((e) => {
          console.log(e)
          throw e
        })
      }
    } else {
      if (warehouseItem) {
        await warehouseItem
          .update(
            {
              price: price && price != 0 ? price : lineItem.unitCost,
            },
            {
              transaction,
            }
          )
          .catch((e) => {
            console.log(e)
            throw e
          })

        await warehouseItem
          .increment(
            {
              onHand: convertedReceiptQuantity,
            },
            {
              transaction,
            }
          )
          .catch((e) => {
            console.log(e)
            throw e
          })
      } else {
        let warehouseItemData = {
          itemMasterId: lineItem.productId,
          warehouseId: lineItem.warehouseId,
          price: price && price != 0 ? price : lineItem.unitCost,
          onHand: convertedReceiptQuantity,
        }

        await db.WarehouseItems.create(warehouseItemData, {
          transaction,
        }).catch((e) => {
          console.log(e)
          throw e
        })
      }
    }
  }
}

const deleteOIVLs = async (slittingReceipt, transaction) => {
  console.log(
    "####################################deleteOIVLs#########################"
  )
  const existingOIVL = await db.OIVL.findAll({
    where: {
      docType: "SLRT",
      documentId: slittingReceipt.id,
      deleted: false,
    },
    attributes: ["id", "outQty"],
  }).catch((error) => {
    console.log(error)
    throw error
  })

  const ids = existingOIVL.map((data) => {
    return data.id
  })

  for (let i = 0; i < existingOIVL.length; i++) {
    const oivlObj = existingOIVL[i]

    if (+oivlObj.outQty > 0)
      throw new Error(
        "Batches has already consumed. Cannot delete the Receipt!"
      )

    await oivlObj
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
  }
}

const deleteSlittingReceiptOIVLs = async (slittingReceiptId, transaction) => {
  console.log(
    "############################################deleteSlittingReceiptOIVLs##################################"
  )
  const slittingReceiptOIVLs = await db.SlittingReceiptOIVL.findAll({
    where: {
      slittingReceiptId,
    },
    attributes: ["oivlId", "quantity", "id"],
    raw: true,
  })

  for (let i = 0; i < slittingReceiptOIVLs.length; i++) {
    const item = slittingReceiptOIVLs[i]

    // Delete Production Receipt OIVL
    await db.SlittingReceiptOIVL.destroy({
      where: {
        id: item.id,
      },
      transaction,
    }).catch((e) => {
      throw e
    })
  }
}

const updateWarehouseItemsOnDelete = async (
  slittingReceiptId,
  slittingOrderId,
  transaction
) => {
  console.log(
    "####################################updateWarehouseItemsOnDelete#########################"
  )
  const slittingReceiptItems = await db.SlittingReceiptItem.findAll({
    where: {
      slittingReceiptId,
    },
    attributes: ["productId", "quantity", "warehouseId", "uomId"],
    raw: true,
    transaction,
  })

  for (let i = 0; i < slittingReceiptItems.length; i++) {
    const item = slittingReceiptItems[i]

    // let convertedQuantity = await getConvertedQuantity(item.uomId, item.productId, item.quantity);

    let convertedQuantity = await convertQtyToBaseUnit(
      item.uomId,
      item.productId,
      item.quantity,
      slittingOrderId,
      transaction
    )

    await db.WarehouseItems.decrement(
      {
        onHand: convertedQuantity,
      },
      {
        where: {
          itemMasterId: item.productId,
          warehouseId: item.warehouseId,
        },
        transaction,
      }
    ).catch((e) => {
      throw e
    })
  }
}

const convertQtyToBaseUnit = async (
  uomId,
  productId,
  quantity,
  slittingOrderId,
  transaction
) => {
  console.log(
    "####################################convertQtyToBaseUnit#########################"
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

  if (uomId != 23) {
    let quantityInBaseUnit = await getConvertedQuantity(
      uomId,
      productId,
      quantity
    )

    return quantityInBaseUnit
  }

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
  let quantityInMT = parseFloat(
    (coilWeight / totalWidth) * semiFinishedWidth
  ).toFixed(4)

  console.log("quantityInMT", quantityInMT)

  return quantityInMT * quantity
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
