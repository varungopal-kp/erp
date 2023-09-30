const Sequelize = require("sequelize")
const Op = Sequelize.Op
const paginate = require("express-paginate")
const jsonexport = require("jsonexport")
const fs = require("fs")
const path = require("path")
const _ = require("lodash")
const moment = require("moment")
const {
  Parser,
  transforms: { unwind },
} = require("json2csv")

const WarehouseItems = require("../models").WarehouseItems
const ItemMaster = require("../models").ItemMaster
const ItemMasterUOMs = require("../models").ItemMasterUOMs
const OIVLBarcodes = require("../models").OIVLBarcodes
const ProductionIssueOIVLs = require("../models").ProductionIssueOIVLs
const ProductionIssue = require("../models").ProductionIssue
const OIVL = require("../models").OIVL
const Warehouse = require("../models").Warehouse
const UOM = require("../models").UOM
const ItemCategory = require("../models").ItemCategory
const ItemMasterAttributes = require("../models").ItemMasterAttribute
const ProductionUnit = require("../models").ProductionUnit
const ProductionOrder = require("../models").ProductionOrder
const PurchasePlan = require("../models").PurchasePlan
const SalesOrder = require("../models").SalesOrder
const SalesOrderItem = require("../models").SalesOrderItem
const WorkCenter = require("../models").WorkCenter
const MachineCenter = require("../models").MachineCenter
const ProductionOrderMachinesAllocations =
  require("../models").ProductionOrderMachinesAllocations
const BillOfMaterials = require("../models").BillOfMaterials
const BOMMachine = require("../models").BOMMachines
const BOMLabour = require("../models").BOMLabours
const BOMComponent = require("../models").BOMComponents
const BOMRoutingStage = require("../models").BOMRoutingStages
const RoutingStages = require("../models").RoutingStages
const Employee = require("../models").Employee
const Status = require("../models").Status
const ProductionOrderComponents = require("../models").ProductionOrderComponents
const ProductionOrderMachines = require("../models").ProductionOrderMachines
const ProductionOrderLabours = require("../models").ProductionOrderLabours
const ProductionOrderMachineDates =
  require("../models").ProductionOrderMachineDates
const ProductionOrderLabourDates =
  require("../models").ProductionOrderLabourDates
const ProductionCostingSummary = require("../models").ProductionCostingSummary
const ProductionReceipt = require("../models").ProductionReceipt
const ProductionReceiptItems = require("../models").ProductionReceiptItems
const PurchaseOrder = require("../models").PurchaseOrder
const PurchaseOrderItem = require("../models").PurchaseOrderItem
const PurchaseGoodsReceiptNote = require("../models").PurchaseGoodsReceiptNote
const PurchaseGoodsReceiptNoteItem =
  require("../models").PurchaseGoodsReceiptNoteItem
const db = require("../models/index")
const status = require("../config/status")
const paths = require("../config/paths.json")
const helper = require("../helpers/helper")

exports.inventoryReport = async (req, res, next) => {
  var filter = {}
  var itemFilter = {}
  var itemAttributeFilter = []
  let whereCondition = {},
    itemWhereCondition = {},
    attributeWhereCondition = [],
    itemAttributeInclude = []

  filter.isDamage = false

  if (req.query.isDamage) filter.isDamage = req.query.isDamage

  if (req.query.itemId) filter.itemMasterId = req.query.itemId

  if (req.query.itemTypeId) itemFilter.typeId = req.query.itemTypeId

  if (req.query.warehouseId) filter.warehouseId = req.query.warehouseId

  if (req.query.length) itemFilter.length = req.query.length

  if (req.query.width) itemFilter.width = req.query.width

  if (req.query.height) itemFilter.height = req.query.height

  if (req.query.thickness) itemFilter.thickness = req.query.thickness

  if (req.query.itemCategoryId) itemFilter.categoryId = req.query.itemCategoryId

  if (req.query.attributes) {
    let attributes = JSON.parse(req.query.attributes)
    for (var i = 0; i < attributes.length; i++) {
      let a = {}
      a.itemAttributeId = attributes[i].attributeId
      a.value = attributes[i].value

      itemAttributeFilter.push({
        [Op.and]: a,
      })
    }
  }

  if (!_.isEmpty(filter)) {
    whereCondition = {
      [Op.and]: filter,
    }
  }

  if (!_.isEmpty(itemFilter)) {
    itemWhereCondition = {
      [Op.and]: itemFilter,
    }
  }

  itemAttributeInclude.push({
    model: UOM,
    as: "InventoryUOM",
    attributes: [],
  })

  if (itemAttributeFilter && itemAttributeFilter.length > 0) {
    attributeWhereCondition = {
      [Op.or]: itemAttributeFilter,
    }

    itemAttributeInclude.push({
      model: ItemMasterAttributes,
      where: attributeWhereCondition,
    })
  }

  // console.log(itemAttributeInclude)

  // whereCondition.isDamage = false;

  await WarehouseItems.findAll({
    attributes: [
      [Sequelize.literal('"ItemMaster"."code"'), "code"],
      [Sequelize.literal('"ItemMaster"."name"'), "name"],
      [Sequelize.literal('"Warehouse"."name"'), "warehouse"],
      [Sequelize.literal('"ItemMaster->InventoryUOM"."name"'), "uom"],
      [Sequelize.literal('"WarehouseItems"."price"'), "price"],
      [
        Sequelize.literal(
          '(SELECT SUM("OIVLs"."openQty") FROM "OIVLs" WHERE "OIVLs"."deleted" = false AND "OIVLs"."itemMasterId" = "WarehouseItems"."itemMasterId" AND "OIVLs"."warehouseId" = "WarehouseItems"."warehouseId")'
        ),
        "stock",
      ],
    ],
    order: [[req.query.sorted.id, req.query.sorted.desc]],
    include: [
      {
        model: ItemMaster,
        as: "ItemMaster",
        attributes: [],
        where: itemWhereCondition,
        include: itemAttributeInclude,
      },
      {
        model: Warehouse,
        as: "Warehouse",
        attributes: [],
      },
    ],
    raw: true,
    where: whereCondition,
  })
    .then(async (results) => {
      if (req.query.hasOwnProperty("excel")) {
        if (results && results.length > 0) {
          const csvfile = await helper.exportReportToCSV(
            results,
            "inventory_report"
          )

          return res.send({
            success: "true",
            file: csvfile,
          })
        } else {
          return res.send({
            success: "false",
            message: "No data found to export",
            file: "",
          })
        }
      }

      return res.send({
        data: results,
        success: true,
        message: "Success",
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

exports.machineAllocations = async (req, res, next) => {
  let filter = []

  let include = []
  let workCenterInclude = []

  if (req.query.productionUnitId) {
    filter.push({
      productionUnitId: req.query.productionUnitId,
    })
  }

  if (req.query.machineId) {
    filter.push({
      machineId: req.query.machineId,
    })
  }

  include.push({
    model: ProductionOrder,
    attributes: [],
    as: "Order",
  })

  include.push({
    model: ProductionUnit,
    attributes: [],
    as: "Unit",
  })

  if (req.query.workCenterId) {
    workCenterInclude.push({
      model: WorkCenter,
      attributes: [],
      where: {
        id: req.query.workCenterId,
      },
      required: true,
    })
  } else {
    workCenterInclude.push({
      model: WorkCenter,
      attributes: [],
    })
  }

  include.push({
    model: MachineCenter,
    attributes: [],
    include: workCenterInclude,
  })

  if (req.query.fromDate && req.query.toDate) {
    let fromDate = req.query.fromDate
    let toDate = req.query.toDate
    filter.push({
      date: {
        [Op.between]: [fromDate, toDate],
      },
    })
  }

  await ProductionOrderMachinesAllocations.findAll({
    attributes: [
      [Sequelize.literal('"Order"."series"'), "Series"],
      [Sequelize.literal('"Order"."docNum"'), "Doc No"],
      [Sequelize.literal('"MachineCenter"."name"'), "Machine"],
      [Sequelize.literal('"MachineCenter->WorkCenter"."name"'), "Work Center"],
      [Sequelize.literal('"Unit"."name"'), "Production Unit"],
      [Sequelize.literal("to_char(\"date\", 'DD-MM-YYYY')"), "Date"],
      [Sequelize.literal('"numberOfHours"'), "Allocated of Hours"],
      [Sequelize.literal('"remainingHours"'), "Remaining Hours"],
    ],
    include: include,
    raw: true,
    where: filter,
    order: [["id", "DESC"]],
  })
    .then(async (results) => {
      console.log(results)

      if (req.query.hasOwnProperty("excel")) {
        if (results && results.length > 0) {
          const csvfile = await helper.exportReportToCSV(
            results,
            "machine_allocations"
          )

          return res.send({
            success: "true",
            file: csvfile,
          })
        } else {
          return res.send({
            success: "false",
            message: "No data found to export",
            file: "",
          })
        }
      }

      return res.send({
        machineAllocations: results,
      })
    })
    .catch((error) => {
      return res.status(400).send({
        error: error.message,
      })
    })
}

exports.billOfMaterials = async (req, res, next) => {
  let filter = []

  let include = [
    {
      model: BOMMachine,
      include: [
        {
          model: MachineCenter,
        },
        {
          model: RoutingStages,
        },
      ],
    },
    {
      model: BOMLabour,
      include: [
        {
          model: Employee,
        },
      ],
    },
    {
      model: BOMComponent,
      attributes: ["productId", "estimatedQuantity", "uomId", "cost"],
      include: [
        {
          model: ItemMaster,
          attributes: ["name"],
        },
        {
          model: Warehouse,
        },
        {
          model: UOM,
          attributes: ["name"],
        },
      ],
    },
    {
      model: UOM,
      attributes: ["name"],
    },
  ]

  if (req.query.productionUnitId) {
    filter.push({
      productionUnitId: req.query.productionUnitId,
    })
  }

  if (req.query.itemMasterId) {
    filter.push({
      productId: req.query.itemMasterId,
    })
  }

  include.push({
    model: ItemMaster,
    attributes: ["name"],
  })

  include.push({
    model: ProductionUnit,
  })

  await BillOfMaterials.findAll({
    attributes: [
      "productId",
      "averageProductionQuantity",
      "uomId",
      "productionUnitId",
    ],
    include: include,
    where: filter,
    order: [["id", "DESC"]],
  })
    .then(async (results) => {
      let filteredBOMs = []

      results.forEach((bom) => {
        let bomComponents = bom.BOMComponents

        let filteredComponents = []

        bomComponents.forEach((bomComponent) => {
          filteredComponents.push({
            item: bomComponent.ItemMaster.name || null,
            estimatedQuantity: bomComponent.estimatedQuantity || null,
            uom: bomComponent.UOM ? bomComponent.UOM.name : null,
            cost: bomComponent.cost || 0,
          })
        })

        console.log(filteredComponents)

        filteredBOMs.push({
          product: bom.ItemMaster.name || null,
          productionUnit: bom.ProductionUnit ? bom.ProductionUnit.name : null,
          averageProductionQuantity: bom.averageProductionQuantity || null,
          uom: bom.UOM ? bom.UOM.name : null,
          components: filteredComponents,
        })
      })

      if (req.query.hasOwnProperty("excel")) {
        if (filteredBOMs && filteredBOMs.length > 0) {
          const csvFile = await helper.exportReportToCSV(
            filteredBOMs,
            "bill_of_materials"
          )

          return res.send({
            success: "true",
            file: csvFile,
          })
        } else {
          return res.send({
            success: "false",
            message: "No data found to export",
            file: "",
          })
        }
      }

      return res.send({
        billOfMaterials: results,
      })
    })
    .catch((error) => {
      return res.status(400).send({
        error: error.message,
      })
    })
}

exports.productionOrders = async (req, res, next) => {
  let filter = []

  let include = [
    {
      model: ProductionOrderComponents,
      attributes: [
        "productId",
        "totalQuantity",
        "uomId",
        "totalCost",
        "issuedQuantity",
      ],
      include: [
        {
          model: ItemMaster,
          attributes: ["name"],
        },
        {
          model: UOM,
          attributes: ["name"],
        },
      ],
    },
    {
      model: UOM,
      attributes: ["name"],
    },
    {
      model: Status,
      attributes: ["name"],
    },
    {
      model: UOM,
      attributes: ["code", "name"],
      as: "DamageUOM",
    },
    {
      model: Warehouse,
      attributes: ["code", "name"],
      as: "DamageWarehouse",
    },
  ]

  if (req.query.productionUnitId) {
    filter.push({
      productionUnitId: req.query.productionUnitId,
    })
  }

  if (req.query.itemMasterId) {
    filter.push({
      productId: req.query.itemMasterId,
    })
  }

  include.push({
    model: ItemMaster,
    attributes: ["name"],
  })

  include.push({
    model: ProductionUnit,
    attributes: ["name"],
  })

  if (req.query.fromDate && req.query.toDate) {
    let fromDate = req.query.fromDate
    let toDate = req.query.toDate
    filter.push({
      docDate: {
        [Op.between]: [fromDate, toDate],
      },
    })
  }

  await ProductionOrder.findAll({
    attributes: [
      "productId",
      "productionUnitId",
      "plannedQuantity",
      "uomId",
      "series",
      "docNum",
      "damageQuantity",
      "damageUOMId",
      "damageWarehouseId",
    ],
    include: include,
    where: filter,
    order: [["id", "DESC"]],
  })
    .then(async (results) => {
      let filteredProductionOrders = []

      results.forEach((productionOrder) => {
        let PORComponents = productionOrder.ProductionOrderComponents

        let filteredComponents = []

        PORComponents.forEach((PORComponent) => {
          filteredComponents.push({
            item: PORComponent.ItemMaster.name || null,
            totalQuantity: PORComponent.totalQuantity || null,
            uom: PORComponent.UOM ? PORComponent.UOM.name : null,
            totalCost: PORComponent.totalCost || 0,
          })
        })

        filteredProductionOrders.push({
          order: `${productionOrder.series}-${productionOrder.docNum}`,
          product: productionOrder.ItemMaster.name || null,
          productionUnit: productionOrder.ProductionUnit
            ? productionOrder.ProductionUnit.name
            : null,
          plannedQuantity: productionOrder.plannedQuantity || null,
          uom: productionOrder.UOM ? productionOrder.UOM.name : null,
          status: productionOrder.Status ? productionOrder.Status.name : null,
          damageQuantity: productionOrder.damageQuantity,
          damageUOMId: productionOrder.damageUOMId,
          damageWarehouseId: productionOrder.damageWarehouseId,
          damageUOM: productionOrder.DamageUOM,
          damageWarehouse: productionOrder.DamageWarehouse,
          components: filteredComponents,
        })
      })

      if (req.query.hasOwnProperty("excel"))
        await exportProductionOrderReport(res, filteredProductionOrders)

      return res.send({
        productionOrders: filteredProductionOrders,
      })
    })
    .catch((error) => {
      return res.status(400).send({
        error: error.message,
      })
    })
}

const exportProductionOrderReport = async (res, data) => {
  const fields = [
    {
      label: "Production Order",
      value: "order",
    },
    {
      label: "Item",
      value: "product",
    },
    {
      label: "Production Unit",
      value: "productionUnit",
    },
    {
      label: "Quantity",
      value: "plannedQuantity",
    },
    {
      label: "UOM",
      value: "uom",
    },
    {
      label: "Component",
      value: "components.item",
    },
    {
      label: "Total Qty",
      value: "components.totalQuantity",
    },
    {
      label: "UOM",
      value: "components.uom",
    },
    {
      label: "Total Cost",
      value: "components.totalCost",
    },
  ]

  const nestedPaths = ["components"]

  if (data && data.length > 0) {
    const csvfile = await helper.exportReportToCSV1(
      data,
      "production_report",
      fields,
      nestedPaths
    )

    return res.send({
      success: "true",
      file: csvfile,
    })
  } else {
    return res.send({
      success: "false",
      message: "No data found to export",
      file: "",
    })
  }
}

exports.damageReport = async (req, res, next) => {
  let filter = []

  let include = [
    // {
    // 	model: ProductionOrderComponents,
    // 	attributes: [ 'productId', 'totalQuantity', 'uomId', 'totalCost', 'issuedQuantity' ],
    // 	include: [
    // 		{
    // 			model: ItemMaster,
    // 			attributes: [ 'name' ]
    // 		},
    // 		{
    // 			model: UOM,
    // 			attributes: [ 'name' ]
    // 		}
    // 	]
    // },
    {
      model: UOM,
      attributes: ["name"],
    },
    {
      model: Status,
      attributes: ["name"],
    },
    {
      model: UOM,
      attributes: ["code", "name"],
      as: "DamageUOM",
    },
    {
      model: Warehouse,
      attributes: ["code", "name"],
      as: "DamageWarehouse",
    },
  ]

  if (req.query.productionUnitId) {
    filter.push({
      productionUnitId: req.query.productionUnitId,
    })
  }

  if (req.query.itemMasterId) {
    filter.push({
      productId: req.query.itemMasterId,
    })
  }

  include.push({
    model: ItemMaster,
    attributes: ["name"],
  })

  include.push({
    model: ProductionUnit,
    attributes: ["name"],
  })

  if (req.query.fromDate && req.query.toDate) {
    let fromDate = req.query.fromDate
    let toDate = req.query.toDate
    filter.push({
      docDate: {
        [Op.between]: [fromDate, toDate],
      },
    })
  }

  await ProductionOrder.findAll({
    attributes: [
      "productId",
      "productionUnitId",
      "plannedQuantity",
      "uomId",
      "series",
      "docNum",
      "damageQuantity",
      "damageUOMId",
      "damageWarehouseId",
    ],
    include,
    where: filter,
    order: [["id", "DESC"]],
  })
    .then(async (results) => {
      let filteredProductionOrders = []

      results.forEach((productionOrder) => {
        filteredProductionOrders.push({
          order: `${productionOrder.series}-${productionOrder.docNum}`,
          product: productionOrder.ItemMaster.name || null,
          productionUnit: productionOrder.ProductionUnit
            ? productionOrder.ProductionUnit.name
            : null,
          plannedQuantity: productionOrder.plannedQuantity || null,
          uom: productionOrder.UOM ? productionOrder.UOM.name : null,
          status: productionOrder.Status ? productionOrder.Status.name : null,

          damageQuantity: `${
            productionOrder.damageQuantity ? productionOrder.damageQuantity : ""
          }-${productionOrder.DamageUOM ? productionOrder.DamageUOM.code : ""}`,
          damageWarehouse: productionOrder.DamageWarehouse
            ? productionOrder.DamageWarehouse.name
            : null,
        })
      })

      if (req.query.hasOwnProperty("excel"))
        await exportDamageReport(res, filteredProductionOrders)

      return res.send({
        productionOrders: filteredProductionOrders,
      })
    })
    .catch((error) => {
      return res.status(400).send({
        error: error.message,
      })
    })
}

const exportDamageReport = async (res, data) => {
  const fields = [
    {
      label: "Production Order",
      value: "order",
    },
    {
      label: "Item",
      value: "product",
    },
    {
      label: "Production Unit",
      value: "productionUnit",
    },
    {
      label: "Quantity",
      value: "plannedQuantity",
    },
    {
      label: "UOM",
      value: "uom",
    },
    {
      label: "Damage Quantity",
      value: "damageQuantity",
    },
    {
      label: "Damage Warehouse",
      value: "damageWarehouse",
    },
  ]

  const nestedPaths = []

  if (data && data.length > 0) {
    const csvfile = await helper.exportReportToCSV1(
      data,
      "damage_report",
      fields,
      nestedPaths
    )

    return res.send({
      success: "true",
      file: csvfile,
    })
  } else {
    return res.send({
      success: "false",
      message: "No data found to export",
      file: "",
    })
  }
}

exports.bomComponentsUsedReport = async (req, res, next) => {
  let filter = []

  let include = [
    {
      model: BillOfMaterials,
      attributes: [],
      include: [
        {
          model: ItemMaster,
          attributes: [],
        },
      ],
    },
    {
      model: ItemMaster,
      attributes: [],
    },
    {
      model: Warehouse,
      attributes: [],
    },
    {
      model: UOM,
      attributes: [],
    },
  ]

  if (req.query.itemMasterId) {
    filter.push({
      productId: req.query.itemMasterId,
    })
  }

  await BOMComponent.findAll({
    attributes: [
      [Sequelize.literal('"ItemMaster"."name"'), "Component Item"],
      [Sequelize.literal('"BillOfMaterial->ItemMaster"."name"'), "Parent Item"],
      [Sequelize.literal('"estimatedQuantity"'), "Estimated Quantity"],
      [Sequelize.literal('"quantityPerUnit"'), "Quantity Per Unit"],
      [Sequelize.literal('"UOM"."name"'), "Unit"],
      [Sequelize.literal('"cost"'), "cost"],
    ],
    include: include,
    raw: true,
    // limit: req.query.limit,
    // offset: req.skip,
    where: filter,
    order: [["id", "DESC"]],
  })
    .then(async (results) => {
      if (req.query.hasOwnProperty("excel")) {
        if (results && results.length > 0) {
          const csvfile = await helper.exportReportToCSV(
            results,
            "component_used"
          )

          return res.send({
            success: "true",
            file: csvfile,
          })
        } else {
          return res.send({
            success: "false",
            message: "No data found to export",
            file: "",
          })
        }
      }

      return res.send({
        bomComponents: results,
      })
    })
    .catch((error) => {
      return res.status(400).send({
        error: error.message,
      })
    })
}

exports.oivlUsedInProductionIssue = async (req, res, next) => {
  let filter = []
  let itemFilter = []

  let include = []
  let oivlInclude = []

  if (req.query.itemMasterId) {
    itemFilter.push({
      id: req.query.itemMasterId,
    })
  }

  if (req.query.itemTypeId) {
    itemFilter.push({
      typeId: req.query.itemTypeId,
    })
  }

  oivlInclude.push({
    model: ItemMaster,
    attributes: [],
    as: "ItemMaster",
    where: itemFilter,
    include: [
      {
        model: UOM,
        attributes: [],
        as: "InventoryUOM",
      },
    ],
    required: true,
  })

  oivlInclude.push({
    model: Warehouse,
    attributes: [],
    as: "Warehouse",
  })

  include.push({
    model: OIVL,
    attributes: [],
    required: true,
    include: oivlInclude,
  })

  include.push({
    attributes: [],
    model: ProductionIssue,
    include: {
      model: ProductionOrder,
      attributes: [],
    },
  })

  include.push({
    attributes: [],
    model: OIVLBarcodes,
  })

  await ProductionIssueOIVLs.findAll({
    attributes: [
      [
        Sequelize.fn(
          "concat",
          Sequelize.col("ProductionIssue->ProductionOrder.series"),
          "-",
          Sequelize.col("ProductionIssue->ProductionOrder.docNum")
        ),
        "Production Order",
      ],
      [
        Sequelize.fn(
          "concat",
          Sequelize.col("ProductionIssue.series"),
          "-",
          Sequelize.col("ProductionIssue.docNum")
        ),
        "Production Issue",
      ],
      [Sequelize.literal('"OIVL->ItemMaster"."name"'), "Item"],
      [Sequelize.literal('"OIVL"."barcode"'), "Barcode"],
      [Sequelize.literal('"quantity"'), "Quantity"],
      [Sequelize.literal('"OIVL->ItemMaster->InventoryUOM"."name"'), "UOM"],
    ],
    include: include,
    raw: true,
    // limit: req.query.limit,
    // offset: req.skip,
    where: filter,
    order: [["id", "DESC"]],
  })
    .then(async (results) => {
      if (req.query.hasOwnProperty("excel")) {
        if (results && results.length > 0) {
          const csvfile = await helper.exportReportToCSV(results, "batch_used")

          return res.send({
            success: "true",
            file: csvfile,
          })
        } else {
          return res.send({
            success: "false",
            message: "No data found to export",
            file: "",
          })
        }
      }

      return res.send({
        productionIssueOIVLs: results,
      })
    })
    .catch((error) => {
      return res.status(400).send({
        error: error.message,
      })
    })
}

exports.allocationLoad = async (req, res, next) => {
  let filter = []

  let include = []
  let workCenterInclude = []

  if (req.query.machineId) {
    filter.push({
      machineId: req.query.machineId,
    })
  }

  include.push({
    model: ProductionOrder,
    attributes: [],
  })

  include.push({
    model: ProductionUnit,
    attributes: [],
  })

  if (req.query.workCenterId) {
    workCenterInclude.push({
      model: WorkCenter,
      attributes: [],
      where: {
        id: req.query.workCenterId,
      },
      required: true,
    })
  } else {
    workCenterInclude.push({
      model: WorkCenter,
      attributes: [],
    })
  }

  include.push({
    model: MachineCenter,
    attributes: [],
    include: workCenterInclude,
    required: true,
  })

  if (req.query.fromDate && req.query.toDate) {
    let fromDate = req.query.fromDate
    let toDate = req.query.toDate
    filter.push({
      date: {
        [Op.between]: [fromDate, toDate],
      },
    })
  }

  await ProductionOrderMachinesAllocations.findAll({
    attributes: [
      [Sequelize.literal('"ProductionOrder"."docNum"'), "Production Order"],
      [Sequelize.literal('"MachineCenter"."name"'), "Machine"],
      [Sequelize.literal('"MachineCenter->WorkCenter"."name"'), "Work Center"],
      [Sequelize.literal('"ProductionUnit"."name"'), "Production Unit"],
      [Sequelize.literal("to_char(\"date\", 'DD-MM-YYYY')"), "Date"],
      [Sequelize.literal('"numberOfHours"'), "Number Of Hours"],
      [Sequelize.literal('"remainingHours"'), "Remaining Hours"],
    ],
    include: include,
    raw: true,
    // limit: req.query.limit,
    // offset: req.skip,
    where: filter,
    order: [["id", "DESC"]],
  })
    .then(async (results) => {
      if (req.query.hasOwnProperty("excel")) {
        if (results && results.length > 0) {
          const csvfile = await helper.exportReportToCSV(results, "load_report")

          return res.send({
            success: "true",
            file: csvfile,
          })
        } else {
          return res.send({
            success: "false",
            message: "No data found to export",
            file: "",
          })
        }
      }

      return res.send({
        machineAllocations: results,
      })
    })
    .catch((error) => {
      return res.status(400).send({
        error: error.message,
      })
    })
}

exports.productionStatement = async (req, res, next) => {
  let filter = []

  let include = [
    {
      model: UOM,
      attributes: [],
    },
    {
      model: Status,
      attributes: [],
    },
    {
      model: ProductionCostingSummary,
      attributes: [],
      // include: [{
      //     model: UOM,
      // }]
    },
  ]

  if (req.query.productionUnitId) {
    filter.push({
      productionUnitId: req.query.productionUnitId,
    })
  }

  if (req.query.itemMasterId) {
    filter.push({
      productId: req.query.itemMasterId,
    })
  }

  include.push({
    model: ItemMaster,
    attributes: [],
  })

  include.push({
    model: ProductionUnit,
    attributes: [],
  })

  if (req.query.fromDate && req.query.toDate) {
    let fromDate = req.query.fromDate
    let toDate = req.query.toDate
    filter.push({
      docDate: {
        [Op.between]: [fromDate, toDate],
      },
    })
  }

  await ProductionOrder.findAll({
    attributes: [
      [Sequelize.col('"ProductionOrder"."series"'), "Series"],
      [Sequelize.col('"ProductionOrder"."docNum"'), "Doc No"],
      [
        Sequelize.literal(
          'to_char("ProductionOrder"."docDate", \'DD-MM-YYYY\')'
        ),
        "Date",
      ],
      [Sequelize.col('"ItemMaster"."name"'), "Product"],
      [Sequelize.col('"ProductionUnit"."name"'), "Production Unit"],
      [Sequelize.col('"ProductionOrder"."plannedQuantity"'), "Planned Qty"],
      [Sequelize.col('"UOM"."name"'), "Unit"],
      [
        Sequelize.col('"ProductionCostingSummary"."plannedUnitCost"'),
        "Planned Unit Cost",
      ],
      [
        Sequelize.col('"ProductionCostingSummary"."plannedTotalCost"'),
        "Planned Total Cost",
      ],
      [
        Sequelize.col('"ProductionCostingSummary"."actualUnitCost"'),
        "Actual Unit Cost",
      ],
      [
        Sequelize.col('"ProductionOrder"."receivedQuantity"'),
        "Received Quantity",
      ],
      [
        Sequelize.col('"ProductionCostingSummary"."actualTotalCost"'),
        "Actual Total Cost",
      ],
      [Sequelize.col('"Status"."name"'), "status"],
    ],
    include: include,
    raw: true,
    // limit: req.query.limit,
    // offset: req.skip,
    where: filter,
    order: [["id", "DESC"]],
  })
    .then(async (results) => {
      if (req.query.hasOwnProperty("excel")) {
        if (results && results.length > 0) {
          const csvfile = await helper.exportReportToCSV(
            results,
            "production_statement"
          )

          return res.send({
            success: "true",
            file: csvfile,
          })
        } else {
          return res.send({
            success: "false",
            message: "No data found to export",
            file: "",
          })
        }
      }

      return res.send({
        productionOrders: results,
      })
    })
    .catch((error) => {
      return res.status(400).send({
        error: error.message,
      })
    })
}

exports.productionAnalysis = async (req, res, next) => {
  let filter = []

  let include = [
    {
      model: UOM,
      attributes: [],
    },
    {
      model: ProductionCostingSummary,
      attributes: [],
      // include: [{
      //     model: UOM,
      // }]
    },
  ]

  if (req.query.productionUnitId) {
    filter.push({
      productionUnitId: req.query.productionUnitId,
    })
  }

  if (req.query.itemMasterId) {
    filter.push({
      productId: req.query.itemMasterId,
    })
  }

  include.push({
    model: ItemMaster,
    attributes: [],
  })

  include.push({
    model: ProductionUnit,
    attributes: [],
  })

  if (req.query.fromDate && req.query.toDate) {
    let fromDate = req.query.fromDate
    let toDate = req.query.toDate
    filter.push({
      docDate: {
        [Op.between]: [fromDate, toDate],
      },
    })
  }

  await ProductionOrder.findAll({
    attributes: [
      [Sequelize.col('"ProductionOrder"."series"'), "Series"],
      [Sequelize.col('"ProductionOrder"."docNum"'), "Doc No"],
      [
        Sequelize.literal(
          'to_char("ProductionOrder"."docDate", \'DD-MM-YYYY\')'
        ),
        "Date",
      ],
      [Sequelize.col('"ItemMaster"."name"'), "Product"],
      [Sequelize.col('"ProductionUnit"."name"'), "Production Unit"],
      [
        Sequelize.col('"ProductionCostingSummary"."plannedQuantity"'),
        "Planned Qty",
      ],
      [Sequelize.col('"UOM"."name"'), "Unit"],
      [Sequelize.col('"ProductionOrder"."receivedQuantity"'), "Received Qty"],
      [Sequelize.col('"ProductionOrder"."rejectedQty"'), "Scrap Qty"],
    ],
    include: include,
    raw: true,
    // limit: req.query.limit,
    // offset: req.skip,
    where: filter,
    order: [["id", "DESC"]],
  })
    .then(async (results) => {
      if (req.query.hasOwnProperty("excel")) {
        if (results && results.length > 0) {
          const csvfile = await helper.exportReportToCSV(
            results,
            "production_analysis"
          )

          return res.send({
            success: "true",
            file: csvfile,
          })
        } else {
          return res.send({
            success: "false",
            message: "No data found to export",
            file: "",
          })
        }
      }

      return res.send({
        productionOrders: results,
      })
    })
    .catch((error) => {
      return res.status(400).send({
        error: error.message,
      })
    })
}

exports.productionCosting = async (req, res, next) => {
  let filter = []

  let include = [
    {
      model: UOM,
      attributes: [],
    },

    {
      model: Status,
      attributes: [],
    },
    {
      model: ProductionCostingSummary,
      attributes: [],
      // include: [{
      //     model: UOM,
      // }]
    },
  ]

  if (req.query.productionUnitId) {
    filter.push({
      productionUnitId: req.query.productionUnitId,
    })
  }

  if (req.query.itemMasterId) {
    filter.push({
      productId: req.query.itemMasterId,
    })
  }

  include.push({
    model: ItemMaster,
    attributes: [],
  })

  include.push({
    model: ProductionUnit,
    attributes: [],
  })

  if (req.query.fromDate && req.query.toDate) {
    let fromDate = req.query.fromDate
    let toDate = req.query.toDate
    filter.push({
      docDate: {
        [Op.between]: [fromDate, toDate],
      },
    })
  }

  filter.push({
    statusId: status.closed,
  })

  await ProductionOrder.findAll({
    attributes: [
      [Sequelize.col('"ProductionOrder"."series"'), "Series"],
      [Sequelize.col('"ProductionOrder"."docNum"'), "Doc No"],
      [
        Sequelize.literal(
          'to_char("ProductionOrder"."docDate", \'DD-MM-YYYY\')'
        ),
        "Date",
      ],
      [Sequelize.col('"ItemMaster"."name"'), "Product"],
      [Sequelize.col('"ProductionUnit"."name"'), "Production Unit"],
      [
        Sequelize.col('"ProductionCostingSummary"."plannedQuantity"'),
        "Planned Qty",
      ],
      [Sequelize.col('"UOM"."name"'), "Unit"],
      [
        Sequelize.col('"ProductionCostingSummary"."plannedUnitCost"'),
        "Planned Unit Cost",
      ],
      [
        Sequelize.col('"ProductionCostingSummary"."plannedComponentCost"'),
        "Planned Component Cost",
      ],
      [
        Sequelize.col('"ProductionCostingSummary"."plannedMachineCost"'),
        "Planned Machine Cost",
      ],
      [
        Sequelize.col('"ProductionCostingSummary"."plannedLabourCost"'),
        "Planned Labour Cost",
      ],
      [
        Sequelize.col('"ProductionCostingSummary"."plannedTotalCost"'),
        "Planned Total Cost",
      ],
      [
        Sequelize.col('"ProductionCostingSummary"."actualQuantity"'),
        "Actual Quantity",
      ],
      [
        Sequelize.col('"ProductionCostingSummary"."actualUnitCost"'),
        "Actual Unit Cost",
      ],
      [
        Sequelize.col('"ProductionCostingSummary"."actualComponentCost"'),
        "Actual Component Cost",
      ],
      [
        Sequelize.col('"ProductionCostingSummary"."actualMachineCost"'),
        "Actual Machine Cost",
      ],
      [
        Sequelize.col('"ProductionCostingSummary"."actualTotalLabourCost"'),
        "Actual Total Labour Cost",
      ],
      [
        Sequelize.col('"ProductionCostingSummary"."actualTotalCost"'),
        "Actual Total Cost",
      ],
    ],
    include: include,
    raw: true,
    // limit: req.query.limit,
    // offset: req.skip,
    where: filter,
    order: [["id", "DESC"]],
  })
    .then(async (results) => {
      if (req.query.hasOwnProperty("excel")) {
        if (results && results.length > 0) {
          const csvfile = await helper.exportReportToCSV(
            results,
            "production_costing"
          )

          return res.send({
            success: "true",
            file: csvfile,
          })
        } else {
          return res.send({
            success: "false",
            message: "No data found to export",
            file: "",
          })
        }
      }

      return res.send({
        productionOrders: results,
      })
    })
    .catch((error) => {
      return res.status(400).send({
        error: error.message,
      })
    })
}

exports.productionShortage = async (req, res, next) => {
  try {
    let filter = []

    let include = [
      {
        model: ProductionOrderComponents,
        attributes: ["productId", "totalQuantity", "uomId"],
        include: [
          {
            model: ItemMaster,
            attributes: ["name"],
            include: [
              {
                model: UOM,
                as: "InventoryUOM",
                attributes: ["name"],
              },
            ],
          },
          {
            model: UOM,
          },
        ],
      },
      {
        model: UOM,
        attributes: ["name"],
      },
      {
        model: ItemMaster,
        attributes: ["name"],
      },
      {
        model: ProductionUnit,
        attributes: ["name"],
      },
    ]

    if (req.query.productionUnitId) {
      filter.push({
        productionUnitId: req.query.productionUnitId,
      })
    }

    if (req.query.itemMasterId) {
      filter.push({
        productId: req.query.itemMasterId,
      })
    }

    if (req.query.fromDate && req.query.toDate) {
      let fromDate = req.query.fromDate
      let toDate = req.query.toDate
      filter.push({
        docDate: {
          [Op.between]: [fromDate, toDate],
        },
      })
    }

    filter.push({
      [Op.or]: [
        {
          statusId: status.planned,
        },
        {
          statusId: status.released,
        },
      ],
    })

    await ProductionOrder.findAndCountAll({
      attributes: ["productId", "productionUnitId", "plannedQuantity", "uomId"],
      include: include,
      where: filter,
      order: [["id", "DESC"]],
    })
      .then(async (results) => {
        let productionOrders
        let show = false,
          count = 0

        if (results && results.rows.length > 0) {
          productionOrders = results.rows
          count = productionOrders.length
          //Iterating and finding out whether the components is in stock or not
          for (let i = 0; i < productionOrders.length; i++) {
            let productionOrder = productionOrders[i]

            if (
              productionOrder.ProductionOrderComponents &&
              productionOrder.ProductionOrderComponents.length > 0
            ) {
              let components = productionOrder.ProductionOrderComponents

              for (let j = 0; j < components.length; j++) {
                let component = components[j]
                let productId = component.productId
                let requiredQty = component.totalQuantity

                //Calculating the total required quantity
                const uomConversionFactor = await ItemMasterUOMs.findOne({
                  where: {
                    itemMasterId: productId,
                    uomId: component.uomId,
                  },
                  attributes: ["conversionFactor"],
                  raw: true,
                }).catch((error) => {
                  throw error
                })

                if (uomConversionFactor && uomConversionFactor.conversionFactor)
                  requiredQty =
                    requiredQty * uomConversionFactor.conversionFactor

                //Calculate available quantity
                const warehouseItems = await WarehouseItems.findAll({
                  where: {
                    itemMasterId: productId,
                    isDamage: false,
                    onHand: {
                      [Op.gt]: 0,
                    },
                  },
                  attributes: ["onHand", "commited", "onOrder"],
                  raw: true,
                }).catch((error) => {
                  throw error
                })

                let totalQuantity = 0
                warehouseItems.map((warehouseItem) => {
                  totalQuantity +=
                    (+warehouseItem.onHand || 0) -
                    (+warehouseItem.committed || 0) +
                    (+warehouseItem.onOrder || 0)
                })

                component.setDataValue("requiredQty", requiredQty)
                component.setDataValue("availableQty", totalQuantity)

                if (requiredQty > totalQuantity) show = true

                productionOrder.setDataValue("show", show)
              }
            }
          }

          productionOrders = productionOrders.filter(
            (productionOrder) => productionOrder.dataValues.show == true
          )

          let filteredProductionOrders = []

          productionOrders.forEach((productionOrder) => {
            let productionOrderComponents =
              productionOrder.ProductionOrderComponents

            let filteredComponents = []

            productionOrderComponents.forEach((productionOrderComponent) => {
              filteredComponents.push({
                item: productionOrderComponent.ItemMaster.name || null,
                totalQuantity: productionOrderComponent.totalQuantity || null,
                uom: productionOrderComponent.UOM
                  ? productionOrderComponent.UOM.name
                  : null,
                requiredQty:
                  productionOrderComponent.dataValues.requiredQty || 0,
                availableQty:
                  productionOrderComponent.dataValues.availableQty || 0,
              })
            })

            console.log(filteredComponents)

            filteredProductionOrders.push({
              product: productionOrder.ItemMaster.name || null,
              productionUnit: productionOrder.ProductionUnit
                ? productionOrder.ProductionUnit.name
                : null,
              plannedQuantity: productionOrder.plannedQuantity || null,
              uom: productionOrder.UOM ? productionOrder.UOM.name : null,
              productionOrderComponents: filteredComponents,
            })
          })

          if (req.query.hasOwnProperty("excel")) {
            if (
              filteredProductionOrders &&
              filteredProductionOrders.length > 0
            ) {
              const csvFile = await helper.exportReportToCSV(
                filteredProductionOrders,
                "production_order_shortage"
              )

              return res.send({
                success: "true",
                file: csvFile,
              })
            } else {
              return res.send({
                success: "false",
                message: "No data found to export",
                file: "",
              })
            }
          }

          return res.send({
            productionOrders: filteredProductionOrders,
          })
        } else {
          return res.send({
            productionOrders: [],
          })
        }
      })
      .catch((error) => {
        throw error
      })
  } catch (error) {
    return res.status(400).send({
      error: error.message,
    })
  }
}

exports.wipValuation = async (req, res, next) => {
  try {
    let filter = []

    let include = [
      {
        model: UOM,
        attributes: [],
      },
      {
        model: ItemMaster,
        attributes: [],
      },
      {
        model: ProductionUnit,
        attributes: [],
      },
      {
        model: ProductionIssue,
        // attributes: [],
      },
      {
        model: ProductionReceipt,
        // attributes: [],
      },
    ]

    if (req.query.productionUnitId) {
      filter.push({
        productionUnitId: req.query.productionUnitId,
      })
    }

    if (req.query.itemMasterId) {
      filter.push({
        productId: req.query.itemMasterId,
      })
    }

    if (req.query.fromDate && req.query.toDate) {
      let fromDate = req.query.fromDate
      let toDate = req.query.toDate
      filter.push({
        docDate: {
          [Op.between]: [fromDate, toDate],
        },
      })
    }

    const results = await ProductionOrder.findAll({
      attributes: [
        [Sequelize.col('"ItemMaster"."name"'), "Product"],
        [Sequelize.col('"ProductionUnit"."name"'), "Production Unit"],
        [Sequelize.col('"plannedQuantity"'), "Quantity"],
        [Sequelize.col('"UOM"."name"'), "Unit"],
      ],
      include: include,
      where: filter,
      order: [["id", "DESC"]],
    }).catch((e) => {
      throw e
    })

    let filteredProductionOrders = results.filter((productionOrder) => {
      if (
        productionOrder.ProductionIssues &&
        productionOrder.ProductionIssues.length > 0 &&
        productionOrder.ProductionReceipts.length === 0
      ) {
        if (productionOrder.dataValues.ProductionIssues)
          delete productionOrder.dataValues.ProductionIssues

        if (productionOrder.dataValues.ProductionReceipts)
          delete productionOrder.dataValues.ProductionReceipts
        return productionOrder
      }
    })

    filteredProductionOrders = filteredProductionOrders.map((item) =>
      item.get({
        plain: true,
      })
    )

    if (req.query.hasOwnProperty("excel")) {
      if (filteredProductionOrders && filteredProductionOrders.length > 0) {
        const csvFile = await helper.exportReportToCSV(
          filteredProductionOrders,
          "wip_valuation"
        )

        return res.send({
          success: "true",
          file: csvFile,
        })
      } else {
        return res.send({
          success: "false",
          message: "No data found to export",
          file: "",
        })
      }
    }

    return res.send({
      productionOrders: filteredProductionOrders,
    })
  } catch (error) {
    res.status(400).send({
      error: error.message,
      success: false,
      message: "failed",
    })
  }
}

exports.fgValuation = async (req, res, next) => {
  try {
    let filter = [
      {
        makeBuy: "make",
      },
    ]

    let include = [
      {
        model: ItemCategory,
        as: "Category",
        attributes: [],
      },
      {
        model: UOM,
        as: "InventoryUOM",
        attributes: [],
      },
      {
        model: ProductionOrder,
        attributes: ["id", "docNum", "series", "docDate", "receivedQuantity"],
        include: [
          {
            model: ProductionCostingSummary,
          },
        ],
        where: {
          statusId: status.closed,
        },
        required: true,
      },
    ]

    if (req.query.categoryId) {
      filter.push({
        categoryId: req.query.categoryId,
      })
    }

    if (req.query.itemMasterId) {
      filter.push({
        id: req.query.itemMasterId,
      })
    }

    const results = await ItemMaster.findAll({
      attributes: [
        [Sequelize.col('"ItemMaster"."code"'), "Item Code"],
        [Sequelize.col('"ItemMaster"."name"'), "Item Name"],
        [Sequelize.col('"Category".name'), "Item Category"],
        [Sequelize.col('"InventoryUOM"."name"'), "UOM"],
      ],
      include: include,
      // raw: true,
      // nest: true,
      // limit: req.query.limit,
      // offset: req.skip,
      where: filter,
      order: [["id", "DESC"]],
    }).catch((e) => {
      throw e
    })

    results.forEach((itemMaster) => {
      let totalMachineCost = 0,
        totalLabourCost = 0,
        totalComponentCost = 0,
        totalCost = 0

      if (!itemMaster.ProductionOrders) return

      const productionOrders = itemMaster.ProductionOrders
      let productionCount = productionOrders.length

      productionOrders.forEach((productionOrder) => {
        productionCount--
        if (!productionOrder.ProductionCostingSummary) return

        const productionCostingSummary =
          productionOrder.ProductionCostingSummary

        totalComponentCost += +productionCostingSummary.actualComponentCost
        totalLabourCost += +productionCostingSummary.actualTotalLabourCost
        totalMachineCost += +productionCostingSummary.actualMachineCost
        totalCost += +productionCostingSummary.actualTotalCost
      })

      if (productionCount == 0) {
        itemMaster.setDataValue("Total Component Cost", totalComponentCost)
        itemMaster.setDataValue("Total Labour Cost", totalLabourCost)
        itemMaster.setDataValue("Total Machine Cost", totalMachineCost)
        itemMaster.setDataValue("Total Cost", totalCost)
      }
    })

    let filteredItemMasters = results.filter((item) => {
      if (item.dataValues.ProductionOrders)
        delete item.dataValues.ProductionOrders

      return item
    })

    filteredItemMasters = filteredItemMasters.map((item) =>
      item.get({
        plain: true,
      })
    )

    if (req.query.hasOwnProperty("excel")) {
      if (filteredItemMasters && filteredItemMasters.length > 0) {
        console.log(filteredItemMasters)
        const csvFile = await helper.exportReportToCSV(
          filteredItemMasters,
          "fg_valuation"
        )

        return res.send({
          success: "true",
          file: csvFile,
        })
      } else {
        return res.send({
          success: "false",
          message: "No data found to export",
          file: "",
        })
      }
    }

    return res.send({
      itemMasters: filteredItemMasters,
      // pageCount,
      // itemCount,
      // pages: paginate.getArrayPages(req)(3, pageCount, req.query.page),
    })
  } catch (error) {
    res.status(400).send({
      error: error.message,
      success: false,
      message: "failed",
    })
  }
}

exports.purchasePlans = async (req, res, next) => {
  try {
    const purchasePlans = await PurchasePlan.findAll({
      attributes: [
        [Sequelize.col('"ItemMaster"."code"'), "Item Code"],
        [Sequelize.col('"ItemMaster"."name"'), "Item Name"],
        [Sequelize.col('"SalesOrder".series'), "SO Series"],
        [Sequelize.col('"SalesOrder".docNum'), "SO Doc No"],
        [Sequelize.col('"quantity"'), "Quantity"],
        [Sequelize.col('"UOM"."name"'), "Unit"],
      ],
      include: [
        {
          model: SalesOrder,
          attributes: [],
        },
        {
          model: ItemMaster,
          attributes: [],
        },
        {
          model: UOM,
          attributes: [],
        },
      ],
      raw: true,
    }).catch((e) => {
      throw e
    })

    if (req.query.hasOwnProperty("excel")) {
      if (purchasePlans && purchasePlans.length > 0) {
        const csvfile = await helper.exportReportToCSV(
          purchasePlans,
          "purchase_plans"
        )

        return res.send({
          success: "true",
          file: csvfile,
        })
      } else {
        return res.send({
          success: "false",
          message: "No data found to export",
          file: "",
        })
      }
    }

    return res.send({
      purchasePlans: purchasePlans,
    })
  } catch (error) {
    res.status(400).send({
      error,
      success: false,
      message: "failed",
    })
  }
}

exports.minimumStockReport = async (req, res, next) => {
  try {
    let categoryFilter = []

    if (req.query.categoryId) {
      categoryFilter.push({
        id: req.query.categoryId,
      })
    }

    const results = await ItemMaster.findAll({
      attributes: [
        // [`concat("ItemMaster"."code", 'hahah')`, 'image'],
        [Sequelize.literal('"ItemMaster"."code"'), "Code"],
        [Sequelize.literal('"ItemMaster"."name"'), "Name"],
        [Sequelize.literal('"Category"."name"'), "Item Category"],
        [Sequelize.literal('"minimumStock"'), "Minimum Stock"],
        [
          Sequelize.literal(
            'SUM("WarehouseItems"."onHand" - "WarehouseItems"."commited")'
          ),
          "Current Stock",
        ],
        [Sequelize.literal('"InventoryUOM"."name"'), "uom"],
      ],
      include: [
        {
          model: WarehouseItems,
          attributes: [],
          as: "WarehouseItems",
          required: false,
          where: {
            isDamage: false,
          },
        },
        {
          model: ItemCategory,
          as: "Category",
          attributes: [],
          where: categoryFilter,
        },
        {
          model: UOM,
          as: "InventoryUOM",
          attributes: [],
        },
      ],
      group: [
        "ItemMaster.id",
        "WarehouseItems.id",
        "Category.id",
        "InventoryUOM.id",
      ],
      having: {
        [Op.or]: [
          Sequelize.where(
            Sequelize.literal(
              'SUM("WarehouseItems"."onHand" - "WarehouseItems"."commited")'
            ),
            {
              [Op.lt]: Sequelize.col("ItemMaster.minimumStock"),
            }
          ),
        ],
      },
      raw: true,
    }).catch((e) => {
      throw e
    })

    if (req.query.hasOwnProperty("excel")) {
      if (results && results.length > 0) {
        const csvfile = await helper.exportReportToCSV(results, "minimum_stock")

        return res.send({
          success: "true",
          file: csvfile,
        })
      } else {
        return res.send({
          success: "false",
          message: "No data found to export",
          file: "",
        })
      }
    }

    return res.send({
      result: results,
      success: "true",
    })
  } catch (error) {
    return res.status(400).send({
      error: error,
      success: false,
      message: "Failed",
    })
  }
}

exports.dailyProduction = async (req, res, next) => {
  let filter = []

  let include = []
  let raw = false,
    nest = false

  if (req.query.machineId) {
    filter.push({
      machineId: req.query.machineId,
    })
  }

  include.push({
    model: ProductionOrder,
    attributes: [
      "id",
      "series",
      "docNum",
      "productId",
      "damageQuantity",
      "damageUOMId",
      "damageWarehouseId",
      "defaultProductReceived",
      "defaultComponentIssued",
    ],
    as: "Order",
    include: [
      {
        model: ProductionReceipt,
        attributes: ["id", "overtime", "remarks"],
        include: {
          model: ProductionReceiptItems,
          attributes: [
            "id",
            "noOfBundles",
            "receiptQuantity",
            "piecesPerBundle",
            "productId",
            "loosePieces",
          ],
          include: [
            { model: ItemMaster, attributes: ["name", "id"] },
            {
              model: UOM,
              attributes: ["code"],
              as: "receiptUOM",
            },
          ],
        },
        where: {
          deletedAt: null,
          deleted: false,
        },
        required: false,
      },
      {
        model: db.UOM,
        attributes: ["code", "name"],
        as: "DamageUOM",
      },
      {
        model: db.Warehouse,
        attributes: ["code", "name"],
        as: "DamageWarehouse",
      },
    ],
  })

  include.push({
    model: MachineCenter,
    attributes: ["name"],
  })

  include.push({
    model: Employee,
    attributes: ["name"],
  })

  if (req.query.date) {
    filter.push({
      date: moment(req.query.date),
    })
  }

  if (req.query.hasOwnProperty("excel")) {
    raw = true
    nest = true
  }

  await ProductionOrderMachinesAllocations.findAll({
    attributes: ["machineId", "noOfLabours", "id", "date", "productionOrderId"],
    include,
    where: filter,
    raw,
    nest,
    order: [["id", "DESC"]],
  })
    .then(async (results) => {
      const data = await refineDailyProductionReport(results)

      if (req.query.hasOwnProperty("excel"))
        await exportDailyProductionReport(res, data)

      return res.send({
        machineAllocations: data,
      })
    })
    .catch((error) => {
      console.log(error)
      return res.status(400).send({
        error: error.message,
      })
    })
}

const refineDailyProductionReport = async (data) => {
  for (let i = 0; i < data.length; i++) {
    const item = data[i]

    if (!item.Order) continue

    const receipts = item.Order.ProductionReceipts
      ? item.Order.ProductionReceipts
      : []

    const bom = await db.BillOfMaterials.findOne({
      where: {
        productId: item.Order.productId,
      },
    }).catch((e) => {
      throw e
    })

    if (!receipts.length) {
      console.log("receipts not found!")
      continue
    }
    for (let j = 0; j < receipts.length; j++) {
      const receipt = receipts[j]
      const receiptItems = receipt.ProductionReceiptItems

      for (let k = 0; k < receiptItems.length; k++) {
        const receiptItem = receiptItems[k]

        const itemMasterId = receiptItem.productId
        const piecesPerBundle = receiptItem.piecesPerBundle

        if (!piecesPerBundle) {
          console.log("piecesPerBundle not found!")
          continue
        }

        const MTUom = await db.UOM.findOne({
          where: {
            code: "MT",
          },
        })

        if (!MTUom) {
          console.log("UOM MT not found!")
          continue
        }

        const bomComponent = await db.BOMComponents.findOne({
          where: {
            bomId: bom.id,
            isDefault: true,
          },
          attributes: ["estimatedQuantity"],
        }).catch((e) => {
          throw e
        })

        if (!bomComponent) {
          console.log("Bill of material component not found!")
          continue
        }

        // const pieceUOM = await db.UOM.findOne({
        // 	where: {
        // 		code: 'pcs'
        // 	}
        // });

        // if (!pieceUOM) {
        // 	console.log('UOM Piece not found!');
        // 	continue;
        // }

        // const pieceUOMConversion = await db.ItemMasterUOMs.findOne({
        // 	where: {
        // 		itemMasterId: itemMasterId,
        // 		uomId: pieceUOM.id
        // 	}
        // });

        // if (!pieceUOMConversion) {
        // 	console.log('pieceUOMConversion not found!');
        // 	continue;
        // }

        // const piecesInBaseUnit = await helper.getConvertedQuantity(pieceUOM.id, itemMasterId, piecesPerBundle);

        const piecesInBaseUnit = parseFloat(
          +piecesPerBundle * +bomComponent.estimatedQuantity
        ).toFixed(4)

        // const itemMaster = await db.ItemMaster.findOne({
        // 	where: {
        // 		id: itemMasterId
        // 	},
        // 	attributes: [ 'inventoryUOMId' ]
        // });

        // let mtUOMConversion = { conversionFactor: 1 };

        // if (itemMaster.inventoryUOMId !== MTUom.id) {
        // 	mtUOMConversion = await db.ItemMasterUOMs.findOne({
        // 		where: {
        // 			itemMasterId: itemMasterId,
        // 			uomId: MTUom.id
        // 		}
        // 	});

        // 	if (!mtUOMConversion) {
        // 		console.log('mtUOMConversion not found!');
        // 		continue;
        // 	}
        // }

        // const MTConversionFactor = mtUOMConversion.conversionFactor;
        // const weightInMT = parseFloat(piecesInBaseUnit * MTConversionFactor).toFixed(4);

        receiptItem.dataValues.bundleWeightInMT = piecesInBaseUnit

        console.log("piecesInBaseUnit", piecesInBaseUnit)

        receiptItem.setDataValue("weightInMT", `${piecesInBaseUnit} MT`)
      }
    }
  }

  return data
}

const exportDailyProductionReport = async (res, data) => {
  const fields = [
    {
      label: "Date",
      value: "date",
    },
    {
      label: "Machine",
      value: "MachineCenter.name",
    },
    {
      label: "Order Series",
      value: "Order.series",
    },
    {
      label: "Order No",
      value: "Order.docNum",
    },
    {
      label: "Operated By",
      value: "Employee.name",
    },
    {
      label: "No of Workers",
      value: "noOfLabours",
    },
    {
      label: "Product",
      value: "Order.ProductionReceipts.ProductionReceiptItems.ItemMaster.name",
    },
    {
      label: "No. Of Bundles",
      value: "Order.ProductionReceipts.ProductionReceiptItems.noOfBundles",
    },
    {
      label: "Pcs / Bundle",
      value: "Order.ProductionReceipts.ProductionReceiptItems.piecesPerBundle",
    },
    {
      label: "Bundle Weight",
      value: "Order.ProductionReceipts.ProductionReceiptItems.bundleWeightInMT",
    },
    {
      label: "Quantity",
      value: "Order.ProductionReceipts.ProductionReceiptItems.receiptQuantity",
    },
    {
      label: "Overtime/Hrs",
      value: "Order.ProductionReceipts.overtime",
    },
    {
      label: "Remarks",
      value: "Order.ProductionReceipts.remarks",
    },
  ]

  const nestedPaths = [
    "Order.ProductionReceipts",
    "Order.ProductionReceipts.ProductionReceiptItems",
  ]

  if (data && data.length > 0) {
    const csvfile = await helper.exportReportToCSV1(
      data,
      "daily_product_report",
      fields,
      nestedPaths
    )

    return res.send({
      success: "true",
      file: csvfile,
    })
  } else {
    return res.send({
      success: "false",
      message: "No data found to export",
      file: "",
    })
  }
}

exports.salesOrders = async (req, res, next) => {
  const { businessPartnerId, branchId, fromDate, toDate, itemMasterIds } =
    req.query
  let filter = [],
    itemFilter = []

  let include = [
    {
      model: db.SalesOrderItem,
      attributes: [
        "itemMasterId",
        "warehouseId",
        "quantity",
        "uomId",
        "price",
        "discount",
        "priceAfterDiscount",
        "tax",
        "total",
      ],
      include: [
        {
          model: db.ItemMaster,
          attributes: ["name"],
        },
        {
          model: db.UOM,
          attributes: ["name", "code"],
        },
        {
          model: db.Warehouse,
          attributes: ["name"],
        },
      ],
      where: itemFilter,
    },
    {
      model: db.BusinessPartner,
      attributes: ["name"],
    },
    {
      model: db.Branch,
      attributes: ["name"],
    },
  ]

  if (businessPartnerId) {
    filter.push({
      businessPartnerId,
    })
  }

  if (branchId) {
    filter.push({
      branchId,
    })
  }

  if (fromDate && toDate) {
    filter.push({
      docDate: {
        [Op.between]: [fromDate, toDate],
      },
    })
  }

  if (itemMasterIds && itemMasterIds.length) {
    console.log("itemMasterIds", itemMasterIds)
    itemFilter.push({
      itemMasterId: {
        in: itemMasterIds,
      },
    })
  }

  if (req.query.hasOwnProperty("excel")) req.query.limit = null

  const salesOrders = await db.SalesOrder.findAndCountAll({
    attributes: [
      "series",
      "docNum",
      "docDate",
      "businessPartnerId",
      "branchId",
      "remarks",
      "totalDiscount",
      "grandTotal",
    ],
    include,
    where: filter,
    limit: req.query.limit,
    offset: req.skip,
    order: [["id", "DESC"]],
  }).catch((error) => {
    console.log(error)
    return res.status(400).send({
      error: error.message,
    })
  })

  const itemCount = salesOrders.count
  const pageCount = Math.ceil(salesOrders.count / req.query.limit)

  const data = await refineSalesOrderReport(salesOrders.rows)

  if (req.query.hasOwnProperty("excel")) await exportSalesOrderReport(res, data)

  return res.send({
    salesOrders: data,
    pageCount,
    itemCount,
    pages: paginate.getArrayPages(req)(3, pageCount, req.query.page),
  })
}

const refineSalesOrderReport = async (data) => {
  let refinedSalesOrder = []

  for (let i = 0; i < data.length; i++) {
    const salesOrder = data[i]

    let filteredItems = []

    for (let j = 0; j < salesOrder.SalesOrderItems.length; j++) {
      const salesOrderItem = salesOrder.SalesOrderItems[j]
      const itemMasterId = salesOrderItem.itemMasterId

      const MTUom = await db.UOM.findOne({
        where: {
          code: "MT",
        },
      })

      if (!MTUom) {
        console.log("UOM MT not found!")
        continue
      }

      const itemMaster = await db.ItemMaster.findOne({
        where: {
          id: itemMasterId,
        },
        attributes: ["inventoryUOMId"],
      })

      let mtUOMConversion = { conversionFactor: 1 }

      if (itemMaster.inventoryUOMId !== MTUom.id) {
        mtUOMConversion = await db.ItemMasterUOMs.findOne({
          where: {
            itemMasterId,
            uomId: MTUom.id,
          },
        })

        if (!mtUOMConversion) {
          console.log("mtUOMConversion not found!")
          continue
        }
      }

      const qtyInBaseUnit = await helper.getConvertedQuantity(
        salesOrderItem.uomId,
        itemMasterId,
        salesOrderItem.quantity
      )

      const MTConversionFactor = mtUOMConversion.conversionFactor
      const weightInMT = qtyInBaseUnit * MTConversionFactor

      // salesOrderItem.setDataValue('weightInMT', `${weightInMT} MT`);

      filteredItems.push({
        item: salesOrderItem.name || null,
        warehouse: salesOrderItem.Warehouse
          ? salesOrderItem.Warehouse.name
          : null,
        quantity: salesOrderItem.quantity || 0,
        uom: salesOrderItem.UOM ? salesOrderItem.UOM.name : null,
        weightInMT: `${weightInMT} MT` || 0,
        price: salesOrderItem.quantity || 0,
        discount: salesOrderItem.discount || 0,
        priceAfterDiscount: salesOrderItem.priceAfterDiscount || 0,
        tax: salesOrderItem.tax || 0,
        total: salesOrderItem.total || 0,
      })
    }

    refinedSalesOrder.push({
      order: salesOrder.series + "-" + salesOrder.docNum,
      docDate: salesOrder.docDate || null,
      businessPartner:
        salesOrder.BusinessPartner && salesOrder.BusinessPartner.name
          ? salesOrder.BusinessPartner.name
          : null,
      branch:
        salesOrder.Branch && salesOrder.Branch.name
          ? salesOrder.Branch.name
          : null,
      remarks: salesOrder.remarks || null,
      totalDiscount: salesOrder.totalDiscount || null,
      grandTotal: salesOrder.grandTotal || null,
      salesOrderItems: filteredItems,
    })
  }

  return refinedSalesOrder
}

const exportSalesOrderReport = async (res, data) => {
  console.log(data)
  const fields = [
    {
      label: "Sales Order",
      value: "order",
    },
    {
      label: "Branch",
      value: "branch",
    },
    {
      label: "Customer",
      value: "businessPartner",
    },
    {
      label: "Total Discount",
      value: "totalDiscount",
    },
    {
      label: "Grand Total",
      value: "grandTotal",
    },
    {
      label: "Product",
      value: "salesOrderItems.item",
    },
    {
      label: "Warehouse",
      value: "salesOrderItems.warehouse",
    },
    {
      label: "Quantity",
      value: "salesOrderItems.quantity",
    },
    {
      label: "UOM",
      value: "salesOrderItems.uom",
    },
    {
      label: "Weight In MT",
      value: "salesOrderItems.weightInMT",
    },
    {
      label: "Price",
      value: "salesOrderItems.price",
    },
    {
      label: "Discount",
      value: "salesOrderItems.discount",
    },
    {
      label: "Price After Discount",
      value: "salesOrderItems.priceAfterDiscount",
    },
    {
      label: "Tax",
      value: "salesOrderItems.tax",
    },
    {
      label: "Total",
      value: "salesOrderItems.total",
    },
    {
      label: "Remarks",
      value: "remarks",
    },
  ]

  const nestedPaths = ["salesOrderItems"]

  if (data && data.length > 0) {
    const csvfile = await helper.exportReportToCSV1(
      data,
      "sales_order_report",
      fields,
      nestedPaths
    )

    return res.send({
      success: "true",
      file: csvfile,
    })
  } else {
    return res.send({
      success: "false",
      message: "No data found to export",
      file: "",
    })
  }
}

exports.salesDeliveryNotes = async (req, res, next) => {
  const { businessPartnerId, branchId, fromDate, toDate, itemMasterIds } =
    req.query
  let filter = [],
    itemFilter = []

  let include = [
    {
      model: db.SalesDeliveryNoteItem,
      attributes: [
        "itemMasterId",
        "warehouseId",
        "quantity",
        "uomId",
        "price",
        "discount",
        "priceAfterDiscount",
        "tax",
        "total",
      ],
      include: [
        {
          model: db.ItemMaster,
          attributes: ["name"],
        },
        {
          model: db.UOM,
          attributes: ["name", "code"],
        },
        {
          model: db.Warehouse,
          attributes: ["name"],
        },
      ],
      where: itemFilter,
    },
    {
      model: db.BusinessPartner,
      attributes: ["name"],
    },
    {
      model: db.Branch,
      attributes: ["name"],
    },
  ]

  if (businessPartnerId) {
    filter.push({
      businessPartnerId,
    })
  }

  if (branchId) {
    filter.push({
      branchId,
    })
  }

  if (fromDate && toDate) {
    filter.push({
      docDate: {
        [Op.between]: [fromDate, toDate],
      },
    })
  }

  if (itemMasterIds && itemMasterIds.length) {
    itemFilter.push({
      itemMasterId: {
        in: itemMasterIds,
      },
    })
  }

  if (req.query.hasOwnProperty("excel")) req.query.limit = null

  const salesDeliveryNotes = await db.SalesDeliveryNote.findAndCountAll({
    attributes: [
      "series",
      "docNum",
      "docDate",
      "businessPartnerId",
      "branchId",
      "remarks",
      "totalDiscount",
      "grandTotal",
    ],
    include,
    where: filter,
    limit: req.query.limit,
    offset: req.skip,
    order: [["id", "DESC"]],
  }).catch((error) => {
    console.log(error)
    return res.status(400).send({
      error: error.message,
    })
  })

  const itemCount = salesDeliveryNotes.count
  const pageCount = Math.ceil(salesDeliveryNotes.count / req.query.limit)

  const data = await refineSalesDeliveryNoteReport(salesDeliveryNotes.rows)

  if (req.query.hasOwnProperty("excel"))
    await exportSalesDeliveryReport(res, data)

  return res.send({
    salesDeliveryNotes: data,
    pageCount,
    itemCount,
    pages: paginate.getArrayPages(req)(3, pageCount, req.query.page),
  })
}

const refineSalesDeliveryNoteReport = async (data) => {
  let refinedSalesDelivery = []

  for (let i = 0; i < data.length; i++) {
    const salesDelivery = data[i]

    let filteredItems = []

    for (let j = 0; j < salesDelivery.SalesDeliveryNoteItems.length; j++) {
      const salesDeliveryItem = salesDelivery.SalesDeliveryNoteItems[j]
      const itemMasterId = salesDeliveryItem.itemMasterId

      const MTUom = await db.UOM.findOne({
        where: {
          code: "MT",
        },
      })

      if (!MTUom) {
        console.log("UOM MT not found!")
        continue
      }

      const itemMaster = await db.ItemMaster.findOne({
        where: {
          id: itemMasterId,
        },
        attributes: ["inventoryUOMId"],
      })

      let mtUOMConversion = { conversionFactor: 1 }

      if (itemMaster.inventoryUOMId !== MTUom.id) {
        mtUOMConversion = await db.ItemMasterUOMs.findOne({
          where: {
            itemMasterId,
            uomId: MTUom.id,
          },
        })

        if (!mtUOMConversion) {
          console.log("mtUOMConversion not found!")
          continue
        }
      }

      const qtyInBaseUnit = await helper.getConvertedQuantity(
        salesDeliveryItem.uomId,
        itemMasterId,
        salesDeliveryItem.quantity
      )

      const MTConversionFactor = mtUOMConversion.conversionFactor
      const weightInMT = qtyInBaseUnit * MTConversionFactor

      filteredItems.push({
        item: salesDeliveryItem.ItemMaster
          ? salesDeliveryItem.ItemMaster.name
          : null,
        warehouse: salesDeliveryItem.Warehouse
          ? salesDeliveryItem.Warehouse.name
          : null,
        quantity: salesDeliveryItem.quantity || 0,
        uom: salesDeliveryItem.UOM ? salesDeliveryItem.UOM.name : null,
        weightInMT: `${weightInMT} MT` || 0,
        price: salesDeliveryItem.quantity || 0,
        discount: salesDeliveryItem.discount || 0,
        priceAfterDiscount: salesDeliveryItem.priceAfterDiscount || 0,
        tax: salesDeliveryItem.tax || 0,
        total: salesDeliveryItem.total || 0,
      })
    }

    refinedSalesDelivery.push({
      delivery: salesDelivery.series + "-" + salesDelivery.docNum,
      docDate: salesDelivery.docDate || null,
      businessPartner:
        salesDelivery.BusinessPartner && salesDelivery.BusinessPartner.name
          ? salesDelivery.BusinessPartner.name
          : null,
      branch:
        salesDelivery.Branch && salesDelivery.Branch.name
          ? salesDelivery.Branch.name
          : null,
      remarks: salesDelivery.remarks || null,
      totalDiscount: salesDelivery.totalDiscount || null,
      grandTotal: salesDelivery.grandTotal || null,
      salesDeliveryItems: filteredItems,
    })
  }

  return refinedSalesDelivery
}

const exportSalesDeliveryReport = async (res, data) => {
  const fields = [
    {
      label: "Sales Delivery",
      value: "delivery",
    },
    {
      label: "Branch",
      value: "branch",
    },
    {
      label: "Customer",
      value: "businessPartner",
    },
    {
      label: "Total Discount",
      value: "totalDiscount",
    },
    {
      label: "Grand Total",
      value: "grandTotal",
    },
    {
      label: "Product",
      value: "salesDeliveryItems.item",
    },
    {
      label: "Warehouse",
      value: "salesDeliveryItems.warehouse",
    },
    {
      label: "Quantity",
      value: "salesDeliveryItems.quantity",
    },
    {
      label: "UOM",
      value: "salesDeliveryItems.uom",
    },
    {
      label: "Weight In MT",
      value: "salesDeliveryItems.weightInMT",
    },
    {
      label: "Price",
      value: "salesDeliveryItems.price",
    },
    {
      label: "Discount",
      value: "salesDeliveryItems.discount",
    },
    {
      label: "Price After Discount",
      value: "salesDeliveryItems.priceAfterDiscount",
    },
    {
      label: "Tax",
      value: "salesDeliveryItems.tax",
    },
    {
      label: "Total",
      value: "salesDeliveryItems.total",
    },
    {
      label: "Remarks",
      value: "remarks",
    },
  ]

  const nestedPaths = ["salesDeliveryItems"]

  if (data && data.length > 0) {
    const csvfile = await helper.exportReportToCSV1(
      data,
      "sales_delivery_report",
      fields,
      nestedPaths
    )

    return res.send({
      success: "true",
      file: csvfile,
    })
  } else {
    return res.send({
      success: "false",
      message: "No data found to export",
      file: "",
    })
  }
}

exports.purchaseOrders = async (req, res, next) => {
  const { businessPartnerId, branchId, fromDate, toDate, itemMasterIds } =
    req.query
  let filter = [],
    itemFilter = []

  let include = [
    {
      model: db.PurchaseOrderItem,
      attributes: [
        "itemMasterId",
        "warehouseId",
        "quantity",
        "uomId",
        "price",
        "discount",
        "priceAfterDiscount",
        "tax",
        "total",
      ],
      include: [
        {
          model: db.ItemMaster,
          attributes: ["name"],
        },
        {
          model: db.UOM,
          attributes: ["name", "code"],
        },
        {
          model: db.Warehouse,
          attributes: ["name"],
        },
      ],
      where: itemFilter,
    },
    {
      model: db.BusinessPartner,
      attributes: ["name"],
    },
    {
      model: db.Branch,
      attributes: ["name"],
    },
  ]

  if (businessPartnerId) {
    filter.push({
      businessPartnerId,
    })
  }

  if (branchId) {
    filter.push({
      branchId,
    })
  }

  if (fromDate && toDate) {
    filter.push({
      docDate: {
        [Op.between]: [fromDate, toDate],
      },
    })
  }

  if (itemMasterIds && itemMasterIds.length) {
    itemFilter.push({
      itemMasterId: {
        in: itemMasterIds,
      },
    })
  }

  await db.PurchaseOrder.findAll({
    attributes: [
      "series",
      "docNum",
      "docDate",
      "businessPartnerId",
      "branchId",
      "remarks",
      "totalDiscount",
      "grandTotal",
    ],
    include,
    where: filter,
    order: [["id", "DESC"]],
  })
    .then(async (results) => {
      const data = await refinePurchaseOrderReport(results)

      if (req.query.hasOwnProperty("excel"))
        await exportPurchaseOrderReport(res, data)

      return res.send({
        purchaseOrders: results,
      })
    })
    .catch((error) => {
      console.log(error)
      return res.status(400).send({
        error: error.message,
      })
    })
}

const refinePurchaseOrderReport = async (data) => {
  let refinedPurchaseOrder = []

  for (let i = 0; i < data.length; i++) {
    const purchaseOrder = data[i]

    let filteredItems = []

    for (let j = 0; j < purchaseOrder.PurchaseOrderItems.length; j++) {
      const purchaseOrderItem = purchaseOrder.PurchaseOrderItems[j]
      const itemMasterId = purchaseOrderItem.itemMasterId

      const MTUom = await db.UOM.findOne({
        where: {
          code: "MT",
        },
      })

      if (!MTUom) {
        console.log("UOM MT not found!")
        continue
      }

      const itemMaster = await db.ItemMaster.findOne({
        where: {
          id: itemMasterId,
        },
        attributes: ["inventoryUOMId"],
      })

      let mtUOMConversion = { conversionFactor: 1 }

      if (itemMaster.inventoryUOMId !== MTUom.id) {
        mtUOMConversion = await db.ItemMasterUOMs.findOne({
          where: {
            itemMasterId,
            uomId: MTUom.id,
          },
        })

        if (!mtUOMConversion) {
          console.log("mtUOMConversion not found!")
          continue
        }
      }

      const qtyInBaseUnit = await helper.getConvertedQuantity(
        purchaseOrderItem.uomId,
        itemMasterId,
        purchaseOrderItem.quantity
      )

      const MTConversionFactor = mtUOMConversion.conversionFactor
      const weightInMT = qtyInBaseUnit * MTConversionFactor

      filteredItems.push({
        item: purchaseOrderItem.ItemMaster
          ? purchaseOrderItem.ItemMaster.name
          : null,
        warehouse: purchaseOrderItem.Warehouse
          ? purchaseOrderItem.Warehouse.name
          : null,
        quantity: purchaseOrderItem.quantity || 0,
        uom: purchaseOrderItem.UOM ? purchaseOrderItem.UOM.name : null,
        weightInMT: `${weightInMT} MT` || 0,
        price: purchaseOrderItem.quantity || 0,
        discount: purchaseOrderItem.discount || 0,
        priceAfterDiscount: purchaseOrderItem.priceAfterDiscount || 0,
        tax: purchaseOrderItem.tax || 0,
        total: purchaseOrderItem.total || 0,
      })
    }

    refinedPurchaseOrder.push({
      delivery: purchaseOrder.series + "-" + purchaseOrder.docNum,
      docDate: purchaseOrder.docDate || null,
      businessPartner:
        purchaseOrder.BusinessPartner && purchaseOrder.BusinessPartner.name
          ? purchaseOrder.BusinessPartner.name
          : null,
      branch:
        purchaseOrder.Branch && purchaseOrder.Branch.name
          ? purchaseOrder.Branch.name
          : null,
      remarks: purchaseOrder.remarks || null,
      totalDiscount: purchaseOrder.totalDiscount || null,
      grandTotal: purchaseOrder.grandTotal || null,
      purchaseOrderItems: filteredItems,
    })
  }

  return refinedPurchaseOrder
}

const exportPurchaseOrderReport = async (res, data) => {
  const fields = [
    {
      label: "Purchase Order",
      value: "order",
    },
    {
      label: "Branch",
      value: "branch",
    },
    {
      label: "Customer",
      value: "businessPartner",
    },
    {
      label: "Total Discount",
      value: "totalDiscount",
    },
    {
      label: "Grand Total",
      value: "grandTotal",
    },
    {
      label: "Product",
      value: "purchaseOrderItems.item",
    },
    {
      label: "Warehouse",
      value: "purchaseOrderItems.warehouse",
    },
    {
      label: "Quantity",
      value: "purchaseOrderItems.quantity",
    },
    {
      label: "UOM",
      value: "purchaseOrderItems.uom",
    },
    {
      label: "Weight In MT",
      value: "purchaseOrderItems.weightInMT",
    },
    {
      label: "Price",
      value: "purchaseOrderItems.price",
    },
    {
      label: "Discount",
      value: "purchaseOrderItems.discount",
    },
    {
      label: "Price After Discount",
      value: "purchaseOrderItems.priceAfterDiscount",
    },
    {
      label: "Tax",
      value: "purchaseOrderItems.tax",
    },
    {
      label: "Total",
      value: "purchaseOrderItems.total",
    },
    {
      label: "Remarks",
      value: "remarks",
    },
  ]

  const nestedPaths = ["purchaseOrderItems"]

  if (data && data.length > 0) {
    const csvfile = await helper.exportReportToCSV1(
      data,
      "purchase_order_report",
      fields,
      nestedPaths
    )

    return res.send({
      success: "true",
      file: csvfile,
    })
  } else {
    return res.send({
      success: "false",
      message: "No data found to export",
      file: "",
    })
  }
}

exports.purchaseGoodsReceiptNotes = async (req, res, next) => {
  const { businessPartnerId, branchId, fromDate, toDate, itemMasterIds } =
    req.query
  let filter = [],
    itemFilter = []

  let include = [
    {
      model: db.PurchaseGoodsReceiptNoteItem,
      attributes: [
        "itemMasterId",
        "warehouseId",
        "quantity",
        "uomId",
        "price",
        "discount",
        "priceAfterDiscount",
        "tax",
        "total",
      ],
      include: [
        {
          model: db.ItemMaster,
          attributes: ["name"],
        },
        {
          model: db.UOM,
          attributes: ["name", "code"],
        },
        {
          model: db.Warehouse,
          attributes: ["name"],
        },
      ],
      where: itemFilter,
    },
    {
      model: db.BusinessPartner,
      attributes: ["name"],
    },
    {
      model: db.Branch,
      attributes: ["name"],
    },
  ]

  if (businessPartnerId) {
    filter.push({
      businessPartnerId,
    })
  }

  if (branchId) {
    filter.push({
      branchId,
    })
  }

  if (fromDate && toDate) {
    filter.push({
      docDate: {
        [Op.between]: [fromDate, toDate],
      },
    })
  }

  if (itemMasterIds && itemMasterIds.length) {
    itemFilter.push({
      itemMasterId: {
        in: itemMasterIds,
      },
    })
  }

  if (req.query.hasOwnProperty("excel")) req.query.limit = null

  const purchaseGoodsReceiptNotes =
    await db.PurchaseGoodsReceiptNote.findAndCountAll({
      attributes: [
        "series",
        "docNum",
        "docDate",
        "businessPartnerId",
        "branchId",
        "remarks",
        "totalDiscount",
        "grandTotal",
      ],
      include,
      where: filter,
      limit: req.query.limit,
      offset: req.skip,
      order: [["id", "DESC"]],
    }).catch((error) => {
      console.log(error)
      return res.status(400).send({
        error: error.message,
      })
    })

  const itemCount = purchaseGoodsReceiptNotes.count
  const pageCount = Math.ceil(purchaseGoodsReceiptNotes.count / req.query.limit)

  const data = await refinePurchaseGoodsReceiptNoteReport(
    purchaseGoodsReceiptNotes.rows
  )

  if (req.query.hasOwnProperty("excel"))
    await exportPurchaseGoodsReceiptNoteReport(res, data)

  return res.send({
    purchaseGoodsReceiptNotes: data,
    pageCount,
    itemCount,
    pages: paginate.getArrayPages(req)(3, pageCount, req.query.page),
  })
}

const refinePurchaseGoodsReceiptNoteReport = async (data) => {
  let refinedPurchaseGoodsReceiptNote = []

  for (let i = 0; i < data.length; i++) {
    const purchaseGoodsReceiptNote = data[i]

    let filteredItems = []

    for (
      let j = 0;
      j < purchaseGoodsReceiptNote.PurchaseGoodsReceiptNoteItems.length;
      j++
    ) {
      const purchaseGoodsReceiptNoteItem =
        purchaseGoodsReceiptNote.PurchaseGoodsReceiptNoteItems[j]
      const itemMasterId = purchaseGoodsReceiptNoteItem.itemMasterId

      const MTUom = await db.UOM.findOne({
        where: {
          code: "MT",
        },
      })

      if (!MTUom) {
        console.log("UOM MT not found!")
        continue
      }

      const itemMaster = await db.ItemMaster.findOne({
        where: {
          id: itemMasterId,
        },
        attributes: ["inventoryUOMId"],
      })

      let mtUOMConversion = { conversionFactor: 1 }

      if (itemMaster.inventoryUOMId !== MTUom.id) {
        mtUOMConversion = await db.ItemMasterUOMs.findOne({
          where: {
            itemMasterId,
            uomId: MTUom.id,
          },
        })

        if (!mtUOMConversion) {
          console.log("mtUOMConversion not found!")
          continue
        }
      }

      const qtyInBaseUnit = await helper.getConvertedQuantity(
        purchaseGoodsReceiptNoteItem.uomId,
        itemMasterId,
        purchaseGoodsReceiptNoteItem.quantity
      )

      const MTConversionFactor = mtUOMConversion.conversionFactor
      const weightInMT = qtyInBaseUnit * MTConversionFactor

      filteredItems.push({
        item: purchaseGoodsReceiptNoteItem.ItemMaster
          ? purchaseGoodsReceiptNoteItem.ItemMaster.name
          : null,
        warehouse: purchaseGoodsReceiptNoteItem.Warehouse
          ? purchaseGoodsReceiptNoteItem.Warehouse.name
          : null,
        quantity: purchaseGoodsReceiptNoteItem.quantity || 0,
        uom: purchaseGoodsReceiptNoteItem.UOM
          ? purchaseGoodsReceiptNoteItem.UOM.name
          : null,
        weightInMT: `${weightInMT} MT` || 0,
        price: purchaseGoodsReceiptNoteItem.quantity || 0,
        discount: purchaseGoodsReceiptNoteItem.discount || 0,
        priceAfterDiscount:
          purchaseGoodsReceiptNoteItem.priceAfterDiscount || 0,
        tax: purchaseGoodsReceiptNoteItem.tax || 0,
        total: purchaseGoodsReceiptNoteItem.total || 0,
      })
    }

    refinedPurchaseGoodsReceiptNote.push({
      note:
        purchaseGoodsReceiptNote.series + "-" + purchaseGoodsReceiptNote.docNum,
      docDate: purchaseGoodsReceiptNote.docDate || null,
      businessPartner:
        purchaseGoodsReceiptNote.BusinessPartner &&
        purchaseGoodsReceiptNote.BusinessPartner.name
          ? purchaseGoodsReceiptNote.BusinessPartner.name
          : null,
      branch:
        purchaseGoodsReceiptNote.Branch && purchaseGoodsReceiptNote.Branch.name
          ? purchaseGoodsReceiptNote.Branch.name
          : null,
      remarks: purchaseGoodsReceiptNote.remarks || null,
      totalDiscount: purchaseGoodsReceiptNote.totalDiscount || null,
      grandTotal: purchaseGoodsReceiptNote.grandTotal || null,
      purchaseGoodsReceiptNoteItems: filteredItems,
    })
  }

  return refinedPurchaseGoodsReceiptNote
}

const exportPurchaseGoodsReceiptNoteReport = async (res, data) => {
  const fields = [
    {
      label: "Purchase Goods Receipt",
      value: "note",
    },
    {
      label: "Branch",
      value: "branch",
    },
    {
      label: "Customer",
      value: "businessPartner",
    },
    {
      label: "Total Discount",
      value: "totalDiscount",
    },
    {
      label: "Grand Total",
      value: "grandTotal",
    },
    {
      label: "Product",
      value: "purchaseGoodsReceiptNoteItems.item",
    },
    {
      label: "Warehouse",
      value: "purchaseGoodsReceiptNoteItems.warehouse",
    },
    {
      label: "Quantity",
      value: "purchaseGoodsReceiptNoteItems.quantity",
    },
    {
      label: "UOM",
      value: "purchaseGoodsReceiptNoteItems.uom",
    },
    {
      label: "Weight In MT",
      value: "purchaseGoodsReceiptNoteItems.weightInMT",
    },
    {
      label: "Price",
      value: "purchaseGoodsReceiptNoteItems.price",
    },
    {
      label: "Discount",
      value: "purchaseGoodsReceiptNoteItems.discount",
    },
    {
      label: "Price After Discount",
      value: "purchaseGoodsReceiptNoteItems.priceAfterDiscount",
    },
    {
      label: "Tax",
      value: "purchaseGoodsReceiptNoteItems.tax",
    },
    {
      label: "Total",
      value: "purchaseGoodsReceiptNoteItems.total",
    },
    {
      label: "Remarks",
      value: "remarks",
    },
  ]

  const nestedPaths = ["purchaseGoodsReceiptNoteItems"]

  if (data && data.length > 0) {
    const csvfile = await helper.exportReportToCSV1(
      data,
      "purchase_goods_note_report",
      fields,
      nestedPaths
    )

    return res.send({
      success: "true",
      file: csvfile,
    })
  } else {
    return res.send({
      success: "false",
      message: "No data found to export",
      file: "",
    })
  }
}

exports.testExcel = async (req, res, next) => {
  const contacts = [
    {
      name: "Bob",
      lastname: "Smith",
    },
    {
      name: "James",
      lastname: "David",
    },
    {
      name: "Robert",
      lastname: "Miller",
    },
    {
      name: "David",
      lastname: "Martin",
    },
  ]

  await jsonexport(contacts, async (err, csvOutput) => {
    console.log(csvOutput)

    const destinationPath = paths.reportExcelExport + "/reports124.csv"

    await fs.readdir(paths.reportExcelExport, (err, files) => {
      if (err) throw err

      for (const file of files) {
        fs.unlink(path.join(paths.reportExcelExport, file), (err) => {
          if (err) throw err
        })
      }
    })

    await fs.writeFile(destinationPath, csvOutput, "utf8", function (err) {
      if (err) throw err
    })

    res.json({
      success: true,
      file: destinationPath.slice(7),
    })
  }).catch((err) => {
    console.error(err)
  })
}

exports.scrapReport = async (req, res, next) => {
  var filter = []

  const include = [
    {
      model: db.SlittingPlan,
      attributes: [],
    },
    {
      model: db.Branch,
      attributes: [],
    },
    {
      model: db.ItemMaster,
      attributes: [],
    },
    {
      model: db.OIVL,
      attributes: [],
    },
    {
      model: db.ProductionUnit,
      attributes: [],
    },
    {
      model: db.Warehouse,
      attributes: [],
    },
  ]

  if (req.query.itemMasterId) filter.productId = req.query.itemMasterId

  if (req.query.warehouseId) filter.warehouseId = req.query.warehouseId

  if (req.query.oivlId) filter.oivlId = req.query.oivlId

  if (req.query.productionUnitId)
    filter.productionUnitId = req.query.productionUnitId

  if (req.query.branchId) filter.branchId = req.query.branchId

  if (req.query.fromDate && req.query.toDate) {
    let fromDate = req.query.fromDate
    let toDate = req.query.toDate
    filter.push({
      startDate: {
        [Op.between]: [fromDate, toDate],
      },
    })
  }

  await db.SlittingOrder.findAll({
    attributes: [
      // 'docDate',
      // 'startDate',
      [
        Sequelize.literal('to_char("SlittingOrder"."docDate", \'DD-MM-YYYY\')'),
        "Document Date",
      ],
      [Sequelize.literal("to_char(\"startDate\", 'DD-MM-YYYY')"), "Start Date"],
      [
        Sequelize.fn(
          "concat",
          Sequelize.col("SlittingOrder.series"),
          "-",
          Sequelize.col("SlittingOrder.docNum")
        ),
        "Document No",
      ],
      [
        Sequelize.fn(
          "concat",
          Sequelize.col("SlittingPlan.series"),
          "-",
          Sequelize.col("SlittingPlan.docNum")
        ),
        "Slitting Plan",
      ],

      [Sequelize.literal('"Branch"."name"'), "Branch"],
      [Sequelize.literal('"ItemMaster"."name"'), "Product"],
      [Sequelize.literal('"OIVL"."barcode"'), "Coil Number"],
      [Sequelize.literal('"ProductionUnit"."name"'), "Production Unit"],
      [Sequelize.literal('"Warehouse"."name"'), "Warehouse"],
      [Sequelize.literal('"SlittingOrder"."width"'), "Width"],
      // [ Sequelize.literal('"ItemMaster->InventoryUOM"."name"'), 'uom' ],
      [Sequelize.literal('"SlittingOrder"."widthConsumed"'), "Width Consumed"],
      [Sequelize.literal('"SlittingOrder"."coilWeight"'), "Coil Weight"],
      [Sequelize.literal('"SlittingOrder"."scrapWeight"'), "Scrap Weight"],
      [Sequelize.literal('"SlittingOrder"."remarks"'), "Remarks"],
    ],
    order: [[req.query.sorted.id, req.query.sorted.desc]],
    include,
    raw: true,
    where: filter,
  })
    .then(async (results) => {
      const totalColumn = {}

      const { totalCoilWeight, totalScrap } = getScrapTotal(results)
      totalColumn["Branch"] = "Total"
      totalColumn["Coil Weight"] = parseFloat(totalCoilWeight).toFixed(4)
      totalColumn["Scrap Weight"] = parseFloat(totalScrap).toFixed(4)

      results.push(totalColumn)

      if (req.query.hasOwnProperty("excel")) {
        if (results && results.length > 0) {
          const csvfile = await helper.exportReportToCSV(
            results,
            "scrap_report"
          )

          return res.send({
            success: "true",
            file: csvfile,
          })
        } else {
          return res.send({
            success: "false",
            message: "No data found to export",
            file: "",
          })
        }
      }

      return res.send({
        data: results,
        success: true,
        message: "Success",
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

const getScrapTotal = (data) => {
  const totalCoilWeight = data.reduce(
    (total, item) => total + +item["Coil Weight"],
    0
  )

  const totalScrap = data.reduce(
    (total, item) => total + +item["Scrap Weight"],
    0
  )

  return {
    totalCoilWeight,
    totalScrap,
  }
}

exports.inventoryBatchReport = async (req, res, next) => {
  var filter = {}
  var itemFilter = {}
  var itemAttributeFilter = []
  let whereCondition = {},
    itemWhereCondition = {},
    attributeWhereCondition = [],
    itemAttributeInclude = []

  if (req.query.itemId) filter.itemMasterId = req.query.itemId

  if (req.query.itemTypeId) itemFilter.typeId = req.query.itemTypeId

  if (req.query.warehouseId) filter.warehouseId = req.query.warehouseId

  if (req.query.length) itemFilter.length = req.query.length

  if (req.query.width) itemFilter.width = req.query.width

  if (req.query.height) itemFilter.height = req.query.height

  if (req.query.thickness) itemFilter.thickness = req.query.thickness

  if (req.query.itemCategoryId) itemFilter.categoryId = req.query.itemCategoryId

  if (req.query.attributes) {
    let attributes = JSON.parse(req.query.attributes)
    for (var i = 0; i < attributes.length; i++) {
      let a = {}
      a.itemAttributeId = attributes[i].attributeId
      a.value = attributes[i].value

      itemAttributeFilter.push({
        [Op.and]: a,
      })
    }
  }

  if (!_.isEmpty(filter)) {
    whereCondition = {
      [Op.and]: filter,
    }
  }

  if (!_.isEmpty(itemFilter)) {
    itemWhereCondition = {
      [Op.and]: itemFilter,
    }
  }

  itemAttributeInclude.push({
    model: UOM,
    as: "InventoryUOM",
    attributes: [],
  })

  if (itemAttributeFilter && itemAttributeFilter.length > 0) {
    attributeWhereCondition = {
      [Op.or]: itemAttributeFilter,
    }

    itemAttributeInclude.push({
      model: ItemMasterAttributes,
      where: attributeWhereCondition,
    })
  }

  whereCondition.openQty = {
    [Op.gt]: 0,
  }

  whereCondition.deleted = false

  await db.OIVL.findAll({
    attributes: [
      [
        Sequelize.fn(
          "concat",
          Sequelize.col("ItemMaster.code"),
          "-",
          Sequelize.col("ItemMaster.name")
        ),
        "Product",
      ],
      [
        Sequelize.fn(
          "concat",
          Sequelize.col("OIVL.docType"),
          "-",
          Sequelize.col("OIVL.docNum")
        ),
        "Document",
      ],
      [Sequelize.literal('"Warehouse"."name"'), "Warehouse"],
      [Sequelize.literal('"OIVL"."docDate"'), "Date"],
      [Sequelize.literal('"OIVL"."barcode"'), "Barcode"],
      [Sequelize.literal('"OIVL"."inQty"'), "In Qty"],
      [Sequelize.literal('"OIVL"."outQty"'), "Out Qty"],
      [Sequelize.literal('"OIVL"."openQty"'), "Stock"],
      [Sequelize.literal('"ItemMaster->InventoryUOM"."name"'), "uom"],
    ],
    order: [[req.query.sorted.id, req.query.sorted.desc]],
    include: [
      {
        model: ItemMaster,
        as: "ItemMaster",
        attributes: [],
        where: itemWhereCondition,
        include: itemAttributeInclude,
      },
      {
        model: Warehouse,
        as: "Warehouse",
        attributes: [],
      },
    ],
    raw: true,
    where: whereCondition,
  })
    .then(async (results) => {
      if (req.query.hasOwnProperty("excel")) {
        if (results && results.length > 0) {
          const csvfile = await helper.exportReportToCSV(
            results,
            "inventory_batch_report"
          )

          return res.send({
            success: "true",
            file: csvfile,
          })
        } else {
          return res.send({
            success: "false",
            message: "No data found to export",
            file: "",
          })
        }
      }

      return res.send({
        data: results,
        success: true,
        message: "Success",
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
