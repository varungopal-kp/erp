const Sequelize = require("sequelize")
const Op = Sequelize.Op
const paginate = require("express-paginate")

const ItemCategoryModel = require("../models").ItemCategory
const ItemCategoryType = require("../models").ItemCategoryType

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

    let whereCondition = {}
    if (filter.length > 0) {
        whereCondition = {
            [Op.and]: filter
        }
    }

    if (req.query.hasOwnProperty("all")) {
        return res.send({
            itemCategories: await ItemCategoryModel.findAll({
                include: [{
                        model: ItemCategoryType
                    },
                    {
                        model: ItemCategoryModel,
                        as: "parentCategory"
                    }
                ],
                order: [
                    ['createdAt', 'DESC']
                ],
                where: whereCondition,
            })
        })
    }

    await ItemCategoryModel.findAndCountAll({
            include: [{
                    model: ItemCategoryType
                },
                {
                    model: ItemCategoryModel,
                    as: "parentCategory"
                }
            ],
            distinct: true,
            limit: req.query.limit,
            offset: req.skip,
            order: [
                ['createdAt', 'DESC']
            ],
            where: whereCondition,
        })
        .then(results => {
            const itemCount = results.count
            const pageCount = Math.ceil(results.count / req.query.limit)
            return res.send({
                itemCategories: results.rows,
                success: true,
                message: "Success",
                pageCount,
                itemCount,
                pages: paginate.getArrayPages(req)(3, pageCount, req.query.page),
            })
        })
        .catch(error => {
            return res.status(400).send({
                error,
                success: false,
                message: "Failed",
            })
        })
        .catch(next)
}

exports.create = async (req, res, next) => {

    let {
        itemCategory
    } = req.body

    await ItemCategoryModel.create(itemCategory)
        .then(result => {
            return res.status(201).send({
                itemCategory: result,
                success: true,
                message: "Success",
            })
        })
        .catch(error => {
            return res.status(400).send({
                error,
                success: false,
                message: "Failed",
            })
        })
}

exports.getOne = async (req, res, next) => {
    const {
        id
    } = req.params

    await ItemCategoryModel.findOne({
            where: {
                id: {
                    [Op.eq]: id
                }
            },
        })
        .then(itemCategory => {
            if (!itemCategory) {
                return res.status(404).send({
                    message: "record Not Found",
                    success: false,
                })
            }
            return res.status(200).send({
                itemCategory,
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
    const {
        itemCategory
    } = req.body

    const itemCategoryObj = await ItemCategoryModel.findOne({
        where: {
            id: {
                [Op.eq]: id
            }
        },
    }).catch(error => {
        return res.status(400).send({
            message: "record Not Found",
            success: false,
        })
    })

    if (!itemCategoryObj) {
        return res.status(404).send({
            message: "record Not Found",
            success: false,
        })
    }

    itemCategoryObj
        .update(itemCategory)
        .then(result => res.status(200).send({
            result,
            success: true,
            message: "Success",
        }))
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

    const itemCategory = await ItemCategoryModel.findOne({
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

    if (!itemCategory) {
        return res.status(404).send({
            message: "record Not Found",
            success: false,
        })
    }

    await itemCategory
        .destroy()
        .then(() => res.status(204).send({
            message: "Deleted",
            success: false,

        }))
        .catch(error => res.status(400).send({
            error,
            success: false,
            message: "Failed",
        }))
}

exports.categoryTypeList = async (req, res, next) => {

    await ItemCategoryType.findAll()
        .then(results => {
            return res.send({
                itemCategoryTypes: results,
                success: true,
                message: "Success",
            })
        })
        .catch(error => {
            return res.status(400).send({
                error,
                success: false,
                message: "Failed",
            })
        })
        .catch(next)
}

exports.getOneCategoryTpe = async (req, res, next) => {
    const {
        id
    } = req.params

    await ItemCategoryType.findOne({
            where: {
                id: {
                    [Op.eq]: id
                }
            },
        })
        .then(itemCategoryType => {
            if (!itemCategoryType) {
                return res.status(404).send({
                    message: "record Not Found",
                    success: false,
                })
            }
            return res.status(200).send({
                itemCategoryType,
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