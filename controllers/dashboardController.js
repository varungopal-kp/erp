const Sequelize = require("sequelize")
const Op = Sequelize.Op
const paginate = require("express-paginate")
const WarehouseItems = require("../models").WarehouseItems
const ItemMaster = require("../models").ItemMaster
const SalesOrder = require("../models").SalesOrder
const BusinessPartner = require("../models").BusinessPartner
const ProductionIssueOIVLs = require("../models").ProductionIssueOIVLs
const ProductionIssue = require("../models").ProductionIssue
const OIVL = require("../models").OIVL
const Warehouse = require("../models").Warehouse
const UOM = require("../models").UOM
const ItemCategory = require("../models").ItemCategory
const WorkCenter = require("../models").WorkCenter
const ProductionUnit = require("../models").ProductionUnit
const ProductionOrder = require("../models").ProductionOrder
const MachineCenter = require("../models").MachineCenter
const ProductionOrderMachinesAllocations = require("../models").ProductionOrderMachinesAllocations
const Status = require("../models").Status
const status = require("../config/status")
const _ = require("lodash")
const moment = require("moment")

exports.dashboard = async (req, res, next) => {
    const productionOrderStatuses = await getProductionOrderStatuses()
    const quarterwiseProductionOrders = await getQuarterwiseProductionOrders()
    const monthwiseProductionOrders = await getMonthwiseProductionOrders()
    const machineAllocationHours = await getMachineAllocationHours()
    const stockShortageItems = await getStockShortageItems()
    const openSalesOrders = await getOpenSalesOrders()


    return res.send({
        dashboard: {
            productionOrderStatuses: productionOrderStatuses,
            machineAllocationHours: machineAllocationHours,
            quarterwiseProductionOrders: quarterwiseProductionOrders,
            monthwiseProductionOrders: monthwiseProductionOrders,
            stockShortageItems: stockShortageItems,
            openSalesOrders: openSalesOrders,
        }
    })
}

const getProductionOrderStatuses = async () => {
    const productionOrders = await ProductionOrder.findAll({
        attributes: [
            'statusId', [Sequelize.fn('COUNT', Sequelize.col('statusId')), 'count']
        ],
        include: [{
            model: Status,
            attributes: ['name']
        }],
        group: ['statusId', 'Status.id'],
        // raw: true
    }).catch(error => {
        throw error
    })


    if (productionOrders && productionOrders.length > 0) {
        let labels = [],
            data = []

        productionOrders.forEach(productionOrder => {
            labels.push(productionOrder.Status.name)
            data.push(+productionOrder.dataValues.count)
        });

        return {
            labels: labels,
            data: data
        }
    } else
        return {}
}

const getQuarterwiseProductionOrders = async () => {
    let year = moment().year()

    const productionOrders = await ProductionOrder.findAll({
        attributes: [
            'quarter', [Sequelize.fn('COUNT', Sequelize.col('quarter')), 'count']
        ],
        where: {
            year: year
        },
        group: ['quarter'],
        // raw: true
    }).catch(error => {
        throw error
    })


    if (productionOrders && productionOrders.length > 0) {
        let labels = [],
            data = []

        productionOrders.forEach(productionOrder => {
            switch (productionOrder.quarter) {
                case 1:
                    labels.push("First Quarter")
                    data.push(+productionOrder.dataValues.count)
                    break;

                case 2:
                    labels.push("Second Quarter")
                    data.push(+productionOrder.dataValues.count)
                    break;

                case 3:
                    labels.push("Third Quarter")
                    data.push(+productionOrder.dataValues.count)
                    break;

                case 4:
                    labels.push("Fourth Quarter")
                    data.push(+productionOrder.dataValues.count)
                    break;

                default:
                    break;
            }
        });

        return {
            labels: labels,
            data: data
        }
    } else
        return {}
}

const getMonthwiseProductionOrders = async () => {
    let year = moment().year()

    const productionOrders = await ProductionOrder.findAll({
        attributes: [
            'month', [Sequelize.fn('COUNT', Sequelize.col('month')), 'count']
        ],
        where: {
            year: year
        },
        group: ['month'],
        // raw: true
    }).catch(error => {
        throw error
    })

    if (productionOrders && productionOrders.length > 0) {
        let labels = [],
            data = []

        productionOrders.forEach(productionOrder => {
            switch (productionOrder.month) {
                case 1:
                    labels.push("January")
                    data.push(+productionOrder.dataValues.count)
                    break;

                case 2:
                    labels.push("February")
                    data.push(+productionOrder.dataValues.count)
                    break;

                case 3:
                    labels.push("March")
                    data.push(+productionOrder.dataValues.count)
                    break;

                case 4:
                    labels.push("April")
                    data.push(+productionOrder.dataValues.count)
                    break;
                case 5:
                    labels.push("May")
                    data.push(+productionOrder.dataValues.count)
                    break;
                case 6:
                    labels.push("June")
                    data.push(+productionOrder.dataValues.count)
                    break;
                case 7:
                    labels.push("July")
                    data.push(+productionOrder.dataValues.count)
                    break;
                case 8:
                    labels.push("August")
                    data.push(+productionOrder.dataValues.count)
                    break;
                case 9:
                    labels.push("September")
                    data.push(+productionOrder.dataValues.count)
                    break;
                case 10:
                    labels.push("October")
                    data.push(+productionOrder.dataValues.count)
                    break;
                case 11:
                    labels.push("November")
                    data.push(+productionOrder.dataValues.count)
                    break;
                case 12:
                    labels.push("December")
                    data.push(+productionOrder.dataValues.count)
                    break;

                default:
                    break;
            }
        });

        return {
            labels: labels,
            data: data
        }
    } else
        return {}
}

const getMachineAllocationHours = async () => {
    let year = moment().year()

    const machineAllocations = await ProductionOrderMachinesAllocations.findAll({
        attributes: [
            'machineId', [Sequelize.fn('SUM', Sequelize.col('numberOfHours')), 'totalHours']
        ],
        include: [{
            model: MachineCenter,
            attributes: ['name']
        }],
        where: {
            year: year
        },
        group: ['machineId', 'MachineCenter.id'],
        // raw: true
    }).catch(error => {
        throw error
    })

    if (machineAllocations && machineAllocations.length > 0) {
        let labels = [],
            data = []

        machineAllocations.forEach(machineAllocation => {
            labels.push(machineAllocation.MachineCenter.name)
            data.push(+machineAllocation.dataValues.totalHours)
        });

        return {
            labels: labels,
            data: data
        }
    } else
        return {}
}

const getStockShortageItems = async () => {
    const results = await ItemMaster.findAll({
        attributes: [
            'id', 'code', 'name', 'minimumStock',
            [Sequelize.literal('SUM("WarehouseItems"."onHand" - "WarehouseItems"."commited")'), "currentStock"],
            [Sequelize.literal('"InventoryUOM"."code"'), "UOM"],
        ],
        include: [{
            model: WarehouseItems,
            attributes: [],
            as: 'WarehouseItems'
            // required: true
        }, {
            model: UOM,
            as: "InventoryUOM",
            attributes: [],
        }],
        group: ['ItemMaster.id', 'WarehouseItems.id', 'InventoryUOM.id'],
        having: {
            [Op.and]: [
                Sequelize.where(
                    Sequelize.literal('SUM("WarehouseItems"."onHand" - "WarehouseItems"."commited")'), {
                        [Op.lt]: Sequelize.col('ItemMaster.minimumStock')
                    }),

            ]
        }
    })

    if (results && results.length > 0) {
        return results
    } else
        return {}
}

const getOpenSalesOrders = async () => {
    const salesOrders = await SalesOrder.findAll({
        attributes: [
            'id', 'docNum', 'series', 'dueDate', 'grandTotal'
        ],
        include: {
            model: BusinessPartner,
            attributes: [
                'name'
            ],
        },
        where: {
            status: 'open'
        }
    })

    if (salesOrders && salesOrders.length > 0) {
        return salesOrders
    } else
        return {}
}

exports.machineAllocationsPerDay = async (req, res, next) => {
    const branchId = req.query.branchId
    let filter = []

    if (req.query.hasOwnProperty("day")) {
        filter.push({
            date: moment().format('Y-M-D')
        })
    }

    if (req.query.hasOwnProperty("week")) {
        let fromDate = moment().add(-1, 'days').format('Y-M-D')
        let toDate = moment().add(7, 'days').format('Y-M-D')

        filter.push({
            date: {
                [Op.between]: [fromDate, toDate]
            },
        })
    }

    const machineAllocations = await ProductionOrderMachinesAllocations.findAll({
        attributes: [
            'id', 'machineId', 'date', [Sequelize.col('numberOfHours'), 'allocatedHours'], 'remainingHours'
        ],
        include: [{
            model: MachineCenter,
            attributes: ['name', 'workCenterId'],
            include: {
                model: WorkCenter,
                attributes: ['name', 'unitId'],
                include: {
                    model: ProductionUnit,
                    attributes: ['name'],
                    where: {
                        branchId: branchId
                    },
                    required: true
                },
                required: true
            },
            required: true
        }],
        where: filter,
        // group: ['machineId', 'MachineCenter.id'],
        // raw: true
    }).catch(error => {
        throw error
    })

    return res.send({
        machineAllocations: machineAllocations
    })
}