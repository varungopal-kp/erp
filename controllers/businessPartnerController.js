const Sequelize = require("sequelize")
const Op = Sequelize.Op
const db = require("../models/index")
const BusinessPartner = require("../models").BusinessPartner
const Currency = require("../models").Currency
const Country = require("../models").Country
const BOMComponent = require("../models").BOMComponents
const ItemMaster = require("../models").ItemMaster
const Employee = require("../models").Employee
const MachineCenter = require("../models").MachineCenter
const _ = require("lodash")
const paginate = require("express-paginate")

exports.list = async (req, res, next) => {
    var filter = []
    var include = [{
            model: Currency,
        },
        {
            model: Country,
            as: "bankCountry"
        },
    ]

    if (req.query.filtered != undefined) {
        req.query.filtered = JSON.stringify(req.query.filtered)

        var filtered = JSON.parse(req.query.filtered)
        for (var i = 0; i < filtered.length; i++) {
            filtered[i] = JSON.parse(filtered[i])
        }

        filter = filtered.map(data => {
            return {
                [data.param]: {
                    [Op.iLike]: `${data.value}%`
                }
            }
        })
    }

    filter.push({
        deleted: false
    })

    if (req.query.type) {
        filter.push({
            type: req.query.type
        })
    }

    await BusinessPartner.findAndCountAll({
            include: include,
            distinct: true,
            limit: req.query.limit,
            offset: req.skip,
            where: filter,
            order: [
                ['id', 'DESC']
            ],
        })
        .then(async results => {
            const itemCount = results.count
            const pageCount = Math.ceil(results.count / req.query.limit)

            return res.send({
                businessPartners: results.rows,
                pageCount,
                itemCount,
                pages: paginate.getArrayPages(req)(3, pageCount, req.query.page),
            })
        })
        .catch(error => {
            return res.status(400).send({
                error: error
            })
        })
}

exports.create = async (req, res, next) => {
    let {
        businessPartner
    } = req.body

    let transaction

    try {
        transaction = await db.sequelize.transaction().catch(e => {
            console.log(e)
            throw e
        });

        const newBusinessPartner = await BusinessPartner.create(businessPartner, {
            transaction: transaction
        }).catch(e => {
            console.log(e)
            throw e
        })

        await transaction.commit();

        return res.status(200).send({
            businessPartner: newBusinessPartner,
            success: true,
            message: "Success",
        })

    } catch (err) {
        // Rollback transaction only if the transaction object is defined
        if (transaction) await transaction.rollback();
        console.log(err)
        return res.status(400).send({
            success: false,
            message: "Failed",
            error: err
        })
    }
}

exports.update = async (req, res, next) => {

    let {
        businessPartner
    } = req.body

    const businessPartnerlId = req.params.id

    let transaction = await db.sequelize.transaction().catch(e => {
        console.log(e)
        throw e
    });

    try {

        const existingBusinessPartner = await BusinessPartner.findOne({
            where: {
                id: businessPartnerlId
            }
        }).catch(e => {
            console.log(e)
            throw e
        })

        await existingBusinessPartner.update(businessPartner, {
            transaction
        }).catch(e => {
            console.log(e)
            throw e
        })

        // commit
        await transaction.commit();

        return res.status(200).send({
            businessPartner: existingBusinessPartner,
            success: true,
            message: "Success",
        })

    } catch (err) {
        // Rollback transaction only if the transaction object is defined
        if (transaction) await transaction.rollback();
        console.log(err)
        return res.status(400).send({
            success: false,
            message: "Failed",
            error: err
        })
    }
}

exports.getOne = async (req, res, next) => {
    const {
        id
    } = req.params

    var include = [{
            model: Currency,
        },
        {
            model: Country,
            as: "bankCountry"
        },
    ]

    await BusinessPartner.findOne({
            where: {
                id: id,
                deleted: false
            },
            include: include,
        })
        .then(result => {
            if (!result) {
                return res.status(404).send({
                    message: "record Not Found",
                    success: false,
                })
            }
            return res.status(200).send({
                businessPartner: result,
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

exports.destroy = async (req, res, next) => {
    const {
        id
    } = req.params

    const businessPartner = await BusinessPartner.findOne({
        where: {
            id: id
        },
    }).catch(error => {
        console.log(error)
        throw error
    })

    if (!businessPartner) {
        return res.status(404).send({
            message: "record Not Found",
            success: false,

        })
    }

    await businessPartner.update({
        deleted: true
    }).catch(error => {
        console.log(error)
        throw error
    })

    return res.status(204).send({
        message: "Deleted Successfully.",
        success: true,

    })
}