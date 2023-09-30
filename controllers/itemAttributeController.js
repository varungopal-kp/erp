const Sequelize = require("sequelize")
const Op = Sequelize.Op
const paginate = require("express-paginate")

const ItemAttributeModel = require("../models").ItemAttribute
const ItemCategory = require("../models").ItemCategory

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

    if (req.query.hasOwnProperty('dimension')) {

        filter.push({
            type: 'dimension'
        })
    }

    if (req.query.hasOwnProperty('property')) {
        filter.push({
            type: 'property'
        })
    }

    await ItemAttributeModel.findAndCountAll({
            include: [{
                model: ItemCategory
            }],
            limit: req.query.limit,
            offset: req.skip,
            distinct: true,
            where: filter,
            order: [
                ['createdAt', 'DESC']
            ],
        })
        .then(results => {
            const itemCount = results.count
            const pageCount = Math.ceil(results.count / req.query.limit)

            return res.send({
                success: true,
                message: "Success",
                ItemAttributes: results.rows,
                pageCount,
                itemCount,
                pages: paginate.getArrayPages(req)(3, pageCount, req.query.page),
            })
        })
        .catch(error => {
            return res.status(400).send({
                success: false,
                message: "failed",
                error
            })
        })
        .catch(next)
}

exports.completeList = async (req, res, next) => {
    await ItemAttributeModel.findAll({
            order: [
                ['id', 'ASC']
            ],
        })
        .then(results => {
            return res.send({
                success: true,
                message: "Success",
                ItemAttributes: results,
            })
        })
        .catch(error => {
            return res.status(400).send({
                success: false,
                message: "failed",
                error
            })
        })
        .catch(next)
}

exports.dimensionList = async (req, res, next) => {
    await ItemAttributeModel.findAll({
            order: [
                ['id', 'ASC']
            ],
            where: {
                type: "dimension"
            },
        })
        .then(results => {
            return res.send({
                success: true,
                message: "Success",
                ItemAttributes: results,
            })
        })
        .catch(error => {
            return res.status(400).send({
                success: false,
                message: "failed",
                error
            })
        })
        .catch(next)
}

exports.propertyList = async (req, res, next) => {
    await ItemAttributeModel.findAll({
            order: [
                ['id', 'ASC']
            ],
            where: {
                type: "property"
            },
        })
        .then(results => {
            return res.send({
                success: true,
                message: "Success",
                ItemAttributes: results,
            })
        })
        .catch(error => {
            return res.status(400).send({
                success: false,
                message: "failed",
                error
            })
        })
        .catch(next)
}

exports.create = async (req, res, next) => {

    let {
        itemAttribute
    } = req.body

    await ItemAttributeModel.create(itemAttribute)
        .then(result => {
            return res.status(201).send({
                success: true,
                message: "Success",
                itemAttribute: result
            })
        })
        .catch(error => {
            return res.status(400).send({
                success: false,
                message: "failed",
                error
            })
        })
}

exports.getOne = async (req, res, next) => {
    const {
        id
    } = req.params

    await ItemAttributeModel.findOne({
            where: {
                id: {
                    [Op.eq]: id
                }
            },
        })
        .then(itemAttribute => {
            if (!itemAttribute) {
                return res.status(404).send({
                    success: false,
                    message: "record Not Found",
                })
            }
            return res.status(200).send({
                success: true,
                message: "Success",
                itemAttribute
            })
        })
        .catch(error => res.status(400).send({
            success: false,
            message: "failed",
            error
        }))
}

exports.update = async (req, res, next) => {
    const {
        id
    } = req.params
    const {
        itemAttribute
    } = req.body

    const itemAttributeObj = await ItemAttributeModel.findOne({
        where: {
            id: {
                [Op.eq]: id
            }
        },
    }).catch(error => {
        return res.status(400).send({
            success: false,
            message: "record Not Found",
        })
    })

    if (!itemAttributeObj) {
        return res.status(404).send({
            success: false,
            message: "record Not Found",
        })
    }

    itemAttributeObj
        .update(itemAttribute)
        .then(result => res.status(200).send({
            success: true,
            message: "Success",
            result
        }))
        .catch(error => res.status(400).send({
            error,
            success: false,
            message: "failed",
        }))
}

exports.destroy = async (req, res, next) => {
    const {
        id
    } = req.params

    const itemAttribute = await ItemAttributeModel.findOne({
        where: {
            id: {
                [Op.eq]: id
            }
        },
    }).catch(error => {
        return res.status(400).send({
            error: error,
            success: false,
            message: "failed",
        })
    })

    if (!itemAttribute) {
        return res.status(404).send({
            message: "record Not Found",
            success: false,

        })
    }

    await itemAttribute
        .destroy()
        .then(() => res.status(204).send({
            success: true,
            message: "Success",
            message: "Deleted"
        }))
        .catch(error => res.status(400).send({
            error,
            success: false,
            message: "failed",
        }))
}