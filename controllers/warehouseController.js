const Sequelize = require("sequelize")
const Op = Sequelize.Op
const paginate = require("express-paginate")
const WarehouseModel = require("../models").Warehouse
const WarehouseItems = require("../models").WarehouseItems
const ItemMaster = require("../models").ItemMaster
const UOM = require("../models").UOM
const Branch = require("../models").Branch
const db = require("../models/index")

exports.list = async (req, res, next) => {
    var filter = []

    if (req.query.filtered != undefined) {
        req.query.filtered = JSON.stringify(req.query.filtered)

        var filtered = JSON.parse(req.query.filtered)
        for (var i = 0; i < filtered.length; i++) {
            filtered[i] = JSON.parse(filtered[i])
        }
        filter = filtered.map(data => {
            if (data.param == "statusId") {
                return {
                    [data.param]: {
                        [Op.eq]: data.value
                    }
                }
            } else {
                return {
                    [data.param]: {
                        [Op.iLike]: "%" + data.value + "%"
                    }
                }
            }
        })
    }

    filter.push({
        isScrap: false
    })

    let include = [{
            model: WarehouseItems,
            as: "WarehouseItems",
            include: [{
                model: ItemMaster,
                as: "ItemMaster",
                include: {
                    model: UOM,
                    as: "InventoryUOM"
                }
            }]
        },
        {
            model: Branch,
            as: "Branch",
        },

    ]

    if (req.query.hasOwnProperty("all")) {
        await WarehouseModel.findAll({
            include: include,
            where: filter,
            order: [
                ['id', 'DESC'],
                [WarehouseItems, 'id', 'ASC'],
            ],
        }).then(results => {
            return res.send({
                warehouses: results,
                success: true,
                message: "Success",
            })
        })
    }

    await WarehouseModel.findAndCountAll({
            include: include,
            distinct: true,
            limit: req.query.limit,
            offset: req.skip,
            where: filter,
            order: [
                ['id', 'DESC'],
                [WarehouseItems, 'id', 'ASC'],
            ],
        })
        .then(results => {
            const itemCount = results.count
            const pageCount = Math.ceil(results.count / req.query.limit)

            return res.send({
                warehouses: results.rows,
                success: true,
                message: "Success",
                pageCount,
                itemCount,
                pages: paginate.getArrayPages(req)(3, pageCount, req.query.page),
            })
        }).catch(error => {
            return res.status(400).send({
                error: error,
                success: false,
                message: "Failed",
            })
        })
        .catch(next)
}

exports.create = async (req, res, next) => {

    let transaction
    try {
        transaction = await db.sequelize.transaction().catch(e => {
            console.log(e)
            throw e
        });

        var warehouse = null

        console.log(req.body)

        let warehouseParams = JSON.parse(req.body.warehouse)

        if (req.files && req.files.length > 0) {
            req.files.forEach((file) => {

                switch (file.fieldname) {
                    case "image":
                        warehouseParams.image = file.path.slice(7)
                        break
                }
            })
        }

        warehouse = await WarehouseModel.create(warehouseParams, {
            transaction
        }).catch(err => {
            console.log(err)
            throw err
        })

        await transaction.commit();
        return res.status(201).send({
            success: true,
            message: "Success",
            warehouse: warehouse
        })

    } catch (err) {
        // Rollback transaction only if the transaction object is defined
        console.log(err)
        if (transaction) await transaction.rollback();

        return res.status(400).send({
            success: false,
            message: "Failed",
            error: err.message
        })
    }

    // let {
    //     warehouse
    // } = req.body

    // await WarehouseModel.create(warehouse)
    //     .then(data => {
    //         return res.status(201).send({
    //             warehouse: data,
    //             success: true,
    //             message: "Success",
    //         })
    //     })
    //     .catch(error => {
    //         return res.status(400).send({
    //             error,
    //             success: false,
    //             message: "Failed",
    //         })
    //     })
}

exports.getOne = async (req, res, next) => {
    const {
        id
    } = req.params

    await WarehouseModel.findOne({
            include: [{
                    model: WarehouseItems,
                    as: "WarehouseItems",
                    include: [{
                        model: ItemMaster,
                        as: "ItemMaster",
                        include: {
                            model: UOM,
                            as: "InventoryUOM"
                        }
                    }]
                },
                {
                    model: Branch,
                    as: "Branch",
                },

            ],
            where: {
                id: {
                    [Op.eq]: id
                },
                isScrap: false
            },
            order: [
                ['id', 'DESC'],
                [WarehouseItems, 'id', 'ASC'],
            ],
        })
        .then(warehouse => {
            if (!warehouse) {
                return res.status(404).send({
                    message: "record Not Found",
                    success: false,
                })
            }
            return res.status(200).send({
                warehouse,
                success: true,
                message: "Success",
            })
        })
        .catch(error => res.status(400).send({
            error,
            success: false,
            message: "Failed",
        }))
}

exports.update = async (req, res, next) => {
    const {
        id
    } = req.params

    const model = await WarehouseModel.findOne({
        where: {
            id: id,
            deletedAt: null
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

    let transaction

    try {
        transaction = await db.sequelize.transaction().catch(e => {
            console.log(e)
            throw e
        });

        var warehouse = null

        let warehouseParams = JSON.parse(req.body.warehouse)

        if (req.files && req.files.length > 0) {
            req.files.forEach((file) => {

                switch (file.fieldname) {
                    case "image":
                        warehouseParams.image = file.path.slice(7)
                        break
                }
            })
        }

        await model.update(warehouseParams, {
            transaction
        }).catch(e => {
            console.log(e)
            throw err
        })

        await transaction.commit();
        return res.status(201).send({
            success: true,
            message: "Success",
            data: model
        })

    } catch (err) {
        // Rollback transaction only if the transaction object is defined
        console.log(err)
        if (transaction) await transaction.rollback();

        return res.status(400).send({
            success: false,
            message: "Failed",
            error: err.message
        })
    }
}

exports.destroy = async (req, res, next) => {
    const {
        id
    } = req.params

    const warehouse = await WarehouseModel.findOne({
        where: {
            id: {
                [Op.eq]: id
            }
        },
    }).catch(error => {
        return res.status(400).send({
            error: error,
            success: false,
            message: "Failed",
        })
    })

    if (!warehouse) {
        return res.status(404).send({
            message: "record Not Found",
            success: false,

        })
    }

    await warehouse
        .destroy()
        .then(() => res.status(204).send({
            message: "Deleted",
            success: true,
        }))
        .catch(error => res.status(400).send({
            error,
            success: false,
            message: "Failed",
        }))
}