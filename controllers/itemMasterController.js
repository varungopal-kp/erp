const fs = require("fs")
var path = require("path")
const Sequelize = require("sequelize")
const Op = Sequelize.Op
const ItemMaster = require("../models").ItemMaster
const Warehouse = require("../models").Warehouse
const WarehouseItems = require("../models").WarehouseItems
const BOMMachine = require("../models").BOMMachines
const BOMLabour = require("../models").BOMLabours
const BOMComponent = require("../models").BOMComponents
const ItemCategory = require("../models").ItemCategory
const Brand = require("../models").Brand
const Department = require("../models").Department
const UOM = require("../models").UOM
const ItemMasterAttributes = require("../models").ItemMasterAttribute
const ItemMasterUOMs = require("../models").ItemMasterUOMs
const Material = require("../models").Material
const ItemAttribute = require("../models").ItemAttribute
const OIVLBarcodes = require("../models").OIVLBarcodes
const ConsumptionType = require("../models").ConsumptionType
const ItemManagementType = require("../models").ItemManagementType
const ProductionUnit = require("../models").ProductionUnit
const OIVL = require("../models").OIVL
const OIVLBundleNumbers = require("../models").OIVLBundleNumbers
const ProductionOrderBundleNumbers =
  require("../models").ProductionOrderBundleNumbers
const BillOfMaterial = require("../models").BillOfMaterials
const paginate = require("express-paginate")
const xlsx = require("xlsx")
const db = require("../models/index")

exports.list = async (req, res, next) => {
  var filter = []

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
            [Op.iLike]: "%" + data.value + "%",
          },
        }
      }
    })
  }

  let include = [
    {
      model: WarehouseItems,
      as: "WarehouseItems",
      include: [
        {
          model: Warehouse,
          as: "Warehouse",
          required: false,
        },
      ],
      required: false,
    },
    {
      model: ItemMasterAttributes,
      include: [
        {
          model: ItemAttribute,
          as: "Attribute",
          required: false,
        },
        {
          model: UOM,
          as: "Uom",
          required: false,
        },
      ],
      required: false,
    },
    {
      model: OIVLBarcodes,
      required: false,
    },
    {
      model: ItemCategory,
      as: "Category",
      required: false,
    },
    {
      model: Department,
      as: "Department",
      required: false,
    },
    {
      model: Brand,
      as: "Brand",
      required: false,
    },
    {
      model: ConsumptionType,
      required: false,
    },
    {
      model: ItemManagementType,
      required: false,
    },
    {
      model: ProductionUnit,
      required: false,
    },
    {
      model: OIVL,
      where: {
        deleted: false,
        openQty: {
          [Op.gt]: 0,
        },
      },
      required: false,
    },
    {
      model: UOM,
      as: "InventoryUOM",
      required: false,
    },
    {
      model: ItemMasterUOMs,
      required: false,
      include: [
        {
          model: UOM,
          required: false,
        },
      ],
    },
    {
      model: Material,
      required: false,
    },
  ]

  if (req.query.consumptionType) {
    let typeId
    switch (req.query.consumptionType) {
      case "manual":
        typeId = 1
        break

      case "backflush":
        typeId = 2
        break
      default:
        break
    }
    filter.push({
      consumptionTypeId: typeId,
    })
  }

  await ItemMaster.findAndCountAll({
    //   order: [[req.query.sorted.id, req.query.sorted.desc]],
    include: include,
    distinct: true,
    limit: req.query.limit,
    offset: req.skip,
    where: filter,
    order: [
      ["id", "DESC"],
      [OIVL, "id", "ASC"],
      [OIVLBarcodes, "id", "ASC"],
      [WarehouseItems, "id", "ASC"],
    ],
  })
    .then(async (results) => {
      const itemCount = results.count
      const pageCount = Math.ceil(results.count / req.query.limit)
      // console.log(results[0])
      return res.send({
        itemMasters: results.rows,
        pageCount,
        itemCount,
        success: true,
        message: "Success",
        pages: paginate.getArrayPages(req)(3, pageCount, req.query.page),
      })
    })
    .catch((error) => {
      console.log(error)
      return res.status(400).send({
        error: error,
        success: false,
        message: "Failed",
      })
    })
}

exports.completeList = async (req, res, next) => {
  let filter = []

  let include = [
    {
      model: WarehouseItems,
      attributes: [
        "warehouseId",
        "onHand",
        "onOrder",
        "commited",
        "price",
        "id",
      ],
      as: "WarehouseItems",
      include: [
        {
          model: Warehouse,
          attributes: ["code", "name", "id"],
          as: "Warehouse",
          required: false,
        },
      ],
      required: false,
    },
    {
      model: ItemMasterAttributes,
      attributes: ["itemAttributeId", "value", "id"],
      include: [
        {
          model: ItemAttribute,
          attributes: ["code", "name", "type", "id"],
          as: "Attribute",
          required: false,
        },
      ],
      required: false,
    },
    {
      model: ItemCategory,
      attributes: ["code", "name", "id"],
      as: "Category",
      required: false,
    },
    {
      model: Department,
      attributes: ["code", "name", "id"],
      as: "Department",
      required: false,
    },
    {
      model: Brand,
      attributes: ["code", "name", "id"],
      as: "Brand",
      required: false,
    },
    {
      model: ConsumptionType,
      attributes: ["name", "id"],
      required: false,
    },
    {
      model: ItemManagementType,
      attributes: ["name", "id"],
      required: false,
    },
    {
      model: ProductionUnit,
      attributes: ["code", "name", "id"],
      required: false,
    },
    {
      model: OIVL,
      where: {
        deleted: false,
        openQty: {
          [Op.gt]: 0,
        },
      },
      required: false,
    },
    {
      model: OIVLBarcodes,
      required: false,
    },
    {
      model: ItemMasterUOMs,
      attributes: ["uomId", "itemMasterId", "conversionFactor", "id"],
      required: false,
      include: [
        {
          model: UOM,
          attributes: ["code", "name", "id"],
          required: false,
        },
      ],
    },
    {
      model: UOM,
      attributes: ["code", "name", "id"],
      as: "InventoryUOM",
      required: false,
    },
    {
      model: Material,
      attributes: ["name", "id"],
      required: false,
    },
    {
      model: BillOfMaterial,
      attributes: [
        "averageProductionQuantity",
        "uomId",
        "totalCost",
        "totalCostInBaseUnit",
        "id",
      ],
      where: {
        deleted: false,
      },
      required: false,
    },
  ]

  if (req.query.consumptionType) {
    let typeId
    switch (req.query.consumptionType) {
      case "manual":
        typeId = 1
        break

      case "backflush":
        typeId = 2
        break
      default:
        break
    }
    filter.push({
      consumptionTypeId: typeId,
    })
  }

  if (req.query.hasOwnProperty("components")) {
    filter.push({
      [Op.or]: [
        {
          typeId: 1, // Raw material
        },
        {
          typeId: 2, // Semi FInished
        },
      ],
    })
  }

  if (req.query.hasOwnProperty("finished")) {
    filter.push({
      [Op.or]: [
        {
          typeId: 3, // FInished
        },
        {
          typeId: 2, // Semi FInished
        },
      ],
    })
  }

  if (req.query.hasOwnProperty("bom")) {
    filter.push({
      [Op.or]: [
        {
          typeId: 3, // FInished
        },
        {
          typeId: 2, // Semi FInished
        },
      ],
    })

    // Show only items which does not have a BOM
    filter.push({
      boms: Sequelize.literal('"BillOfMaterial"."productId" IS NULL'),
    })
  }

  if (req.query.hasOwnProperty("make")) {
    filter.push({
      makeBuy: "make",
    })
  }

  if (req.query.hasOwnProperty("buy")) {
    filter.push({
      makeBuy: "buy",
    })
  }

  if (req.query.hasOwnProperty("type")) {
    filter.push({
      typeId: req.query.type,
    })
  }

  const attributes = [
    "id",
    "code",
    "name",
    "inventoryUOMId",
    "categoryId",
    "departmentId",
    "brandId",
    "warehouseId",
    "valuationMethod",
    "length",
    "width",
    "height",
    "weight",
    "thickness",
    "density",
    "lengthUomId",
    "widthUomId",
    "heightUomId",
    "weightUomId",
    "thicknessUomId",
    "densityUomId",
    "typeId",
    "statusId",
    "remarks",
    "latestBarcode",
    "consumptionTypeId",
    "managementTypeId",
    "productionUnitId",
    "makeBuy",
    "minimumStock",
    "maximumStock",
    "bundleString1",
    "bundleString2",
    "bundleInitialNumber",
    "bundleNextNumber",
    "materialId",
  ]

  await ItemMaster.findAll({
    attributes,
    include,
    order: [["id", "ASC"]],
    where: filter,
  })
    .then((results) => {
      return res.send({
        success: true,
        message: "Success",
        itemMasters: results,
      })
    })
    .catch((error) => {
      console.log(error)
      return res.status(400).send({
        success: false,
        message: "failed",
        error: error.message,
      })
    })
    .catch(next)
}

exports.warehouseWiseItemList = async (req, res, next) => {
  var filter = []

  if (req.query.filtered != undefined) {
    req.query.filtered = JSON.stringify(req.query.filtered)

    var filtered = JSON.parse(req.query.filtered)
    for (var i = 0; i < filtered.length; i++) {
      filtered[i] = JSON.parse(filtered[i])
    }
    filter = filtered.map((data) => {
      if (data.param == "statusId" || data.param == "warehouseId") {
        return {
          [data.param]: {
            [Op.eq]: data.value,
          },
        }
      } else {
        return {
          [data.param]: {
            [Op.iLike]: "%" + data.value + "%",
          },
        }
      }
    })
  }

  let whereCondition = {}
  if (filter.length > 0) {
    whereCondition = {
      [Op.and]: filter,
    }
  }

  whereCondition.isDamage = false

  // console.log({ filter })
  await WarehouseItems.findAndCountAll({
    include: [
      {
        model: ItemMaster,
        as: "ItemMaster",
        // include: [{
        //     model: Warehouse,
        //     as: "Warehouse",
        // }]
      },
    ],
    limit: req.query.limit,
    offset: req.skip,
    where: whereCondition,
  })
    .then(async (results) => {
      const itemCount = results.count
      const pageCount = Math.ceil(results.count / req.query.limit)

      return res.send({
        items: results,
        pageCount,
        itemCount,
        success: true,
        message: "Success",
      })
    })
    .catch((error) => {
      return res.status(400).send({
        error: error,
        success: false,
        message: "Failed",
      })
    })
}

exports.create = async (req, res, next) => {
  let { itemMaster } = req.body

  itemMaster.bundleNextNumber = itemMaster.bundleInitialNumber

  const newItem = await ItemMaster.create(itemMaster, {
    include: [ItemMasterAttributes, ItemMasterUOMs],
  }).catch((error) => {
    return error
  })

  if (!newItem) {
    return res.status(400).send({
      error: newItem,
      success: false,
      message: "Failed",
    })
  }

  await insertWarehouseItem(newItem.id, itemMaster.warehouseId, null)

  return res.status(201).send({
    itemMaster: newItem,
    success: true,
    message: "Success",
  })
}

exports.getOne = async (req, res, next) => {
  const { id } = req.params

  let include = [
    {
      model: UOM,
      as: "InventoryUOM",
      required: false,
    },
    {
      model: ItemCategory,
      as: "Category",
      required: false,
    },
    {
      model: Department,
      as: "Department",
      required: false,
    },
    {
      model: Brand,
      as: "Brand",
      required: false,
    },
    {
      model: WarehouseItems,
      as: "WarehouseItems",
      required: false,
      include: [
        {
          model: Warehouse,
          as: "Warehouse",
          required: false,
        },
      ],
    },
    {
      model: OIVLBarcodes,
      include: [
        {
          model: Warehouse,
          as: "Warehouse",
          required: false,
        },
        {
          model: OIVL,
          attributes: ["barcode"],
          required: false,
        },
      ],
      required: false,
    },
    {
      model: ItemMasterAttributes,
      include: [
        {
          model: ItemAttribute,
          as: "Attribute",
          required: false,
        },
        {
          model: UOM,
          as: "Uom",
          required: false,
        },
      ],
      required: false,
    },
    {
      model: ConsumptionType,
      required: false,
    },
    {
      model: ItemManagementType,
      required: false,
    },
    {
      model: ProductionUnit,
      required: false,
    },
    {
      model: ItemMasterUOMs,
      required: false,
      include: [
        {
          model: UOM,
          required: false,
        },
      ],
    },
    {
      model: OIVL,
      attributes: [
        "id",
        "barcode",
        "openQty",
        "price",
        "docDate",
        "itemMasterId",
      ],
      where: {
        deleted: false,
        openQty: {
          [Op.gt]: 0,
        },
      },
      include: [
        {
          model: ItemMaster,
          as: "ItemMaster",
          attributes: ["id", "code", "name"],
          include: {
            model: UOM,
            as: "InventoryUOM",
            attributes: ["code", "name"],
          },
        },
        {
          model: OIVLBundleNumbers,
          attributes: ["id", "quantityInBaseUnit", "available"],
          include: {
            model: ProductionOrderBundleNumbers,
            attributes: ["bundleNumber", "docDate"],
            as: "PORBundleNos",
          },
          where: {
            available: true,
          },
          required: false,
        },
      ],
      required: false,
    },
    {
      model: Material,
      required: false,
    },
  ]
  await ItemMaster.findOne({
    where: {
      id: {
        [Op.eq]: id,
      },
    },
    include,
    order: [
      ["id", "DESC"],
      [OIVL, "id", "ASC"],
      [OIVLBarcodes, "id", "ASC"],
      [WarehouseItems, "id", "ASC"],
    ],
  })
    .then((itemMaster) => {
      if (!itemMaster) {
        return res.status(404).send({
          error,
          success: false,
          message: "Record Not Found",
        })
      }
      return res.status(200).send({
        itemMaster: itemMaster,
        success: true,
        message: "Success",
      })
    })
    .catch((error) => {
      console.log(error.message)
      return res.status(400).send({
        error,
        success: false,
        message: "Failed",
      })
    })
}

exports.update = async (req, res, next) => {
  let transaction = await db.sequelize.transaction().catch((e) => {
    console.log(e)
    throw e
  })

  try {
    const { id } = req.params

    const { itemMaster } = req.body

    const itemMasterAttributes = req.body.itemMaster.ItemMasterAttributes
    const itemMasterUOMs = req.body.itemMaster.ItemMasterUOMs

    const itemMasterObj = await ItemMaster.findOne({
      where: {
        id: {
          [Op.eq]: id,
        },
      },
    }).catch((error) => {
      console.log(error)
      throw error
    })

    if (!itemMasterObj) throw "record Not Found"

    if (itemMaster.bundleInitialNumber && itemMasterObj.managementTypeId != 4)
      itemMaster.bundleNextNumber = itemMaster.bundleInitialNumber

    await itemMasterObj
      .update(itemMaster, {
        transaction,
      })
      .catch((error) => {
        throw error
      })

    await insertItemMasterAttributes(itemMasterAttributes, id, transaction)

    await insertItemMasterUOMs(itemMasterUOMs, id, transaction)

    await insertWarehouseItem(id, itemMaster.warehouseId, transaction)

    // commit
    await transaction.commit()

    return res.status(200).send({
      itemMaster: itemMasterObj,
      success: true,
      message: "Success",
    })
  } catch (error) {
    // Rollback transaction only if the transaction object is defined
    if (transaction) await transaction.rollback()
    console.log(error)
    return res.status(400).send({
      message: error.message,
      success: false,
    })
  }
}

const insertItemMasterAttributes = async (
  itemMasterAttributes,
  itemMasterId,
  transaction
) => {
  const existingItemAttributes = await ItemMasterAttributes.findAll({
    where: {
      itemMasterId: itemMasterId,
    },
  }).catch((error) => {
    console.log(error)
    throw error
  })

  const attributeIds = itemMasterAttributes.map((x) => x.id)
  const attributesToDelete = existingItemAttributes.filter(
    (x) => !attributeIds.includes(x.id)
  )

  // Delete the items which is removed by user
  for (attribute of attributesToDelete) {
    await attribute
      .destroy({
        transaction,
      })
      .catch((error) => {
        console.log(error)
        throw error
      })
  }

  for (let i = 0; i < itemMasterAttributes.length; i++) {
    const item = itemMasterAttributes[i]
    var inputParams = {
      itemMasterId: itemMasterId,
      itemAttributeId: item.itemAttributeId,
      value: item.value,
    }

    if (item.id) {
      const itemAttributeObj = await ItemMasterAttributes.findOne({
        where: {
          id: item.id,
        },
      }).catch((error) => {
        console.log(error)
        throw error
      })

      if (itemAttributeObj)
        await itemAttributeObj
          .update(inputParams, {
            transaction,
          })
          .catch((error) => {
            console.log(error)
            throw error
          })
    } else {
      inputParams.itemMasterId = itemMasterId

      await ItemMasterAttributes.create(inputParams, {
        transaction,
      }).catch((e) => {
        console.log(e)
        throw e
      })
    }
  }
}

const insertWarehouseItem = async (itemMasterId, warehouseId, transaction) => {
  console.log(
    "############################insertWarehouseItem############################"
  )
  const warehouseItem = await WarehouseItems.findOne({
    where: {
      itemMasterId: itemMasterId,
      warehouseId: warehouseId,
      isDamage: false,
    },
  }).catch((error) => {
    throw error
  })

  console.log(warehouseItem)

  if (!warehouseItem) {
    const warehouseItemParam = {
      itemMasterId: itemMasterId,
      warehouseId: warehouseId,
    }

    await WarehouseItems.create(warehouseItemParam, {
      transaction,
    }).catch((error) => {
      throw error
    })
  }
}

const insertItemMasterUOMs = async (
  itemMasterUOMs,
  itemMasterId,
  transaction
) => {
  const existingItemMasterUOMs = await ItemMasterUOMs.findAll({
    where: {
      itemMasterId: itemMasterId,
    },
  }).catch((error) => {
    console.log(error)
    throw error
  })

  const uomIds = itemMasterUOMs.map((x) => x.id)
  const uomsToDelete = existingItemMasterUOMs.filter(
    (x) => !uomIds.includes(x.id)
  )

  // Delete the items which is removed by user
  for (uom of uomsToDelete) {
    await uom
      .destroy({
        transaction,
      })
      .catch((error) => {
        console.log(error)
        throw error
      })
  }

  for (let i = 0; i < itemMasterUOMs.length; i++) {
    const item = itemMasterUOMs[i]
    var inputParams = {
      itemMasterId: itemMasterId,
      uomId: item.uomId,
      conversionFactor: item.conversionFactor,
    }

    if (item.id) {
      const itemMasterUOMObj = await ItemMasterUOMs.findOne({
        where: {
          id: item.id,
        },
      }).catch((error) => {
        console.log(error)
        throw error
      })

      if (itemMasterUOMObj)
        await itemMasterUOMObj
          .update(inputParams, {
            transaction,
          })
          .catch((error) => {
            console.log(error)
            throw error
          })
    } else {
      await ItemMasterUOMs.create(inputParams, {
        transaction,
      }).catch((e) => {
        console.log(e)
        throw e
      })
    }
  }
}

exports.destroy = async (req, res, next) => {
  const { id } = req.params

  const itemMasterObj = await ItemMaster.findOne({
    where: {
      id: {
        [Op.eq]: id,
      },
    },
  }).catch((error) => {
    console.log(error)
    return res.status(400).send({
      message: "record Not Found",
      success: false,
    })
  })

  if (!itemMasterObj) {
    return res.status(404).send({
      message: "record Not Found",
      success: false,
    })
  }

  await itemMasterObj
    .destroy()
    .then(() =>
      res.status(204).send({
        message: "Deleted",
        success: true,
      })
    )
    .catch((error) =>
      res.status(400).send({
        error,
        success: false,
        message: "Failed",
      })
    )
}

exports.getOIVLs = async (req, res, next) => {
  const { itemMasterId } = req.params

  const { warehouseId } = req.params

  await OIVL.findAll({
    where: {
      itemMasterId: itemMasterId,
      warehouseId: warehouseId,
      deleted: false,
      openQty: {
        [Op.gt]: 0,
      },
    },
    include: {
      model: OIVLBundleNumbers,
      where: {
        available: true,
      },
      required: false,
    },
  })
    .then((result) => {
      if (!result) {
        return res.status(404).send({
          error,
          success: false,
          message: "Records Not Found",
        })
      }
      return res.status(200).send({
        oivls: result,
        success: true,
        message: "Success",
      })
    })
    .catch((error) => {
      console.log(error.message)
      return res.status(400).send({
        error,
        success: false,
        message: "Failed",
      })
    })
}

exports.getOIVLBarcodes = async (req, res, next) => {
  const { itemMasterId } = req.params

  const { warehouseId } = req.params

  await OIVLBarcodes.findAll({
    where: {
      itemMasterId: itemMasterId,
      warehouseId: warehouseId,
      available: true,
      deletedAt: null,
    },
  })
    .then((result) => {
      if (!result) {
        return res.status(404).send({
          error,
          success: false,
          message: "Records Not Found",
        })
      }
      return res.status(200).send({
        oivls: result,
        success: true,
        message: "Success",
      })
    })
    .catch((error) => {
      console.log(error.message)
      return res.status(400).send({
        error,
        success: false,
        message: "Failed",
      })
    })
}

exports.getOIVLBundles = async (req, res, next) => {
  const { itemMasterId } = req.params

  const { warehouseId } = req.params

  await OIVLBundleNumbers.findAll({
    attributes: [
      "id",
      "productionOrderId",
      "bundleNumber",
      "oivlId",
      "quantityInBaseUnit",
      "available",
      "numberOfPieces",
      "productionReceiptId",
      "bundleNumber",
    ],
    include: [
      // {
      // 	model: ProductionOrderBundleNumbers,
      // 	as: 'PORBundleNos'
      // },
      {
        model: db.ProductionReceipt,
        attributes: ["series", "docNum", "docDate"],
      },
      {
        model: OIVL,
        attributes: [
          "id",
          "itemMasterId",
          "warehouseId",
          "openQty",
          "price",
          "barcode",
        ],
        where: {
          itemMasterId: itemMasterId,
          warehouseId: warehouseId,
          deletedAt: null,
        },
        required: true,
      },
    ],
    where: {
      available: true,
      bundleNumber: {
        [Op.ne]: null,
      },
    },
  })
    .then((result) => {
      if (!result) {
        return res.status(404).send({
          error,
          success: false,
          message: "Records Not Found",
        })
      }
      return res.status(200).send({
        oivls: result,
        success: true,
        message: "Success",
      })
    })
    .catch((error) => {
      console.log(error.message)
      return res.status(400).send({
        error,
        success: false,
        message: "Failed",
      })
    })
}

exports.getStock = async (req, res, next) => {
  const { itemMasterId, warehouseId } = req.params

  await OIVL.findOne({
    attributes: [[Sequelize.fn("sum", Sequelize.col("openQty")), "stock"]],
    group: ["itemMasterId", "warehouseId"],
    where: {
      itemMasterId,
      warehouseId,
      deleted: false,
    },
  })
    .then((data) => {
      return res.status(200).send({
        data,
        success: true,
        message: "Success",
      })
    })
    .catch((e) => {
      throw e
    })
}

exports.uploadExcel = async (req, res, next) => {
  let transaction = await db.sequelize.transaction().catch((e) => {
    console.log(e)
    throw e
  })
  let processErrors = [],
    createdItems = []

  try {
    var workbook = xlsx.read(req.files.file.data, {
      type: "array",
    })

    var worksheet = workbook.Sheets[workbook.SheetNames[4]]
    let jsonSheet = xlsx.utils.sheet_to_json(worksheet, {
      defval: "",
    })

    for (let i = 0; i < jsonSheet.length; i++) {
      let item = jsonSheet[i]

      if (!item.ItemName || !item.ItemCode) throw "missing"

      let itemParams = {
        code: item.ItemCode || null,
        name: item.ItemName || null,
        categoryId: 4,
        departmentId: 1,
        managementTypeId: 2,
        makeBuy: "make",
        inventoryUOMId: item.InventoryUOM || 1,
        materialId: item.MaterialId || null,
        width: item.WIDTH || null,
        height: item.HEIGHT || null,
        thickness: item.THICKNESS || null,
        length: item.LENGTH || null,
        widthUomId: item.WIDTHUOM || null,
        heightUomId: item.HEIGHTUOM || null,
        thicknessUomId: item.THICKNESSUOM || null,
        lengthUomId: item.LENGTHUOM || null,
        consumptionTypeId: 1,
        valuationMethod: "m",
        bundleString1: item.bundleString1 || null,
        bundleString2: item.bundleString2 || null,
        bundleInitialNumber: item.bundleInitialNumber || null,
        warehouseId: null,
        typeId: 1,
      }

      let itemUOMs = []

      if (item.WTPERPCS) {
        itemUOMs.push({
          uomId: 11,
          conversionFactor: item.WTPERPCS,
        })
      }

      if (item.WTPERBDL) {
        itemUOMs.push({
          uomId: 3,
          conversionFactor: item.WTPERBDL,
        })
      }

      if (item.WTPERMeter) {
        itemUOMs.push({
          uomId: 10,
          conversionFactor: item.WTPERMeter,
        })
      }

      itemParams.ItemMasterUOMs = itemUOMs

      console.log(itemParams)

      const newItem = await ItemMaster.create(itemParams, {
        include: [ItemMasterUOMs],
        transaction,
      }).catch((error) => {
        processErrors.push({
          itemCode: itemParams.code,
          itemName: itemParams.name,
          errors: {
            name: error.name,
            errorCode: error.parent.code || null,
          },
        })
        throw error
      })

      if (newItem)
        createdItems.push({
          itemCode: itemParams.code,
          itemName: itemParams.name,
        })

      console.log(itemParams)

      // throw "BUG"
    }

    transaction.commit()
    res.send({
      success: true,
      createdItems: createdItems,
      errors: processErrors,
    })
  } catch (error) {
    // Rollback transaction only if the transaction object is defined
    console.log(error)
    if (transaction) await transaction.rollback()

    return res.status(400).send({
      success: false,
      message: "Failed",
      error: error,
      createdItems: createdItems,
      errors: processErrors,
    })
  }
}

exports.uploadBOMExcel = async (req, res, next) => {
  let transaction = await db.sequelize.transaction().catch((e) => {
    console.log(e)
    throw e
  })

  let processErrors = [],
    createdBOMs = [],
    bomParams = {},
    bomComponents = [],
    bomMachines = []

  try {
    var workbook = xlsx.read(req.files.file.data, {
      type: "array",
    })

    var worksheet = workbook.Sheets[workbook.SheetNames[0]]
    let jsonSheet = xlsx.utils.sheet_to_json(worksheet, {
      defval: "",
    })

    for (let i = 0; i < jsonSheet.length; i++) {
      let item = jsonSheet[i]

      if (item.itemCode && item.itemCode !== "#" && !bomParams.productId) {
        const product = await ItemMaster.findOne({
          where: {
            code: item.itemCode,
          },
        }).catch((e) => {
          throw e
        })

        if (!product) {
          processErrors.push({
            productId: "Missing",
            item: item.itemCode,
          })

          continue
        }

        bomParams = {
          productId: product.id,
          averageProductionQuantity: item.averageProductionQuantity,
          uomId: item.uomId,
          productionUnitId: 12,
          remarks: item.remarks,
        }

        if (item.component) {
          let component = await ItemMaster.findOne({
            where: Sequelize.where(
              Sequelize.fn("lower", Sequelize.col("name")),
              Sequelize.fn("lower", item.component)
            ),
          }).catch((e) => {
            throw e
          })

          if (!component) {
            processErrors.push({
              componentId: "Missing",
              item: item.component,
            })

            continue
          }

          let quantityInBaseUnit = 0

          if (+item.estimatedQty && +item.estimatedQty > 0)
            quantityInBaseUnit = (
              +item.estimatedQty / item.averageProductionQuantity
            ).toFixed(4)

          bomComponents.push({
            productId: component.id,
            estimatedQuantity: item.estimatedQty,
            uomId: item.componentUom,
            quantityPerUnit: item.estimatedQty,
            quantityInBaseUnit,
            warehouseId: 20,
          })
        }

        if (item.machineId) {
          let hoursInBaseUnit = 0,
            costInBaseUnit = 0,
            hoursPerUnit = 0

          if (+item.estimatedQty && +item.estimatedQty > 0) {
            hoursInBaseUnit = (+item.estimatedTime / item.estimatedQty).toFixed(
              4
            )
            costInBaseUnit = (100 / item.estimatedQty).toFixed(4)
            hoursPerUnit = (+item.estimatedTime / item.estimatedQty).toFixed(4)
          }

          bomMachines.push({
            machineId: item.machineId,
            routingStageNumber: "1001", //item.routingStageNumber,
            routingStageId: item.routingStageId,
            estimatedTime: item.estimatedTime,
            hoursPerUnit: hoursPerUnit,
            hoursInBaseUnit: hoursInBaseUnit,
            cost: 100,
            costInBaseUnit: costInBaseUnit,
            noOfLabours: item.noOfLabours,
          })
        }
      }

      if (!item.itemCode) {
        if (item.component) {
          let component = await ItemMaster.findOne({
            where: {
              name: {
                $iLike: item.component,
              },
            },
          }).catch((e) => {
            throw e
          })

          if (!component) {
            processErrors.push({
              componentId: "Missing",
              item: item.component,
            })

            continue
          }

          let quantityInBaseUnit = 0

          if (+item.estimatedQty && +item.estimatedQty > 0)
            quantityInBaseUnit = (
              +item.estimatedQty / item.averageProductionQuantity
            ).toFixed(4)

          bomComponents.push({
            productId: component.id,
            estimatedQuantity: item.estimatedQty,
            uomId: item.componentUom,
            quantityPerUnit: item.estimatedQty,
            quantityInBaseUnit,
            warehouseId: 20,
          })
        }
      }

      if (item.itemCode && item.itemCode !== "#" && bomParams.productId) {
        let include = [
          {
            model: BOMComponent,
            required: true,
          },
          {
            model: BOMMachine,
            required: true,
          },
        ]

        bomParams.BOMComponents = bomComponents
        bomParams.BOMMachines = bomMachines

        console.log(bomParams)

        const newBillOfMaterial = await BillOfMaterial.create(bomParams, {
          include: include,
          transaction: transaction,
        }).catch((e) => {
          console.log(e)
          processErrors.push({
            productId: bomParams.productId,
            errors: {
              name: e.name,
              errorCode: e.parent.code || null,
            },
          })
          throw e
        })

        if (!newBillOfMaterial) throw "failed"

        createdBOMs.push({
          bomId: newBillOfMaterial.id,
          productId: bomParams.productId,
        })

        bomParams = {}
        bomComponents = []
        bomMachines = []
      }
    }

    transaction.commit()
    res.send({
      success: true,
      createdBOMs: createdBOMs,
      errors: processErrors,
    })
  } catch (error) {
    // Rollback transaction only if the transaction object is defined
    console.log(error)
    if (transaction) await transaction.rollback()

    return res.status(400).send({
      success: false,
      message: "Failed",
      error: error,
      createdBOMs: createdBOMs,
      errors: processErrors,
    })
  }
}
