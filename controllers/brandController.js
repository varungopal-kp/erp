const Sequelize = require("sequelize")
const Op = Sequelize.Op
const paginate = require("express-paginate")
const BrandModel = require("../models").Brand

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

    await BrandModel.findAndCountAll({
            limit: req.query.limit,
            offset: req.skip,
            where: whereCondition,
            order: [
                ['createdAt', 'DESC']
            ],
        })
        .then(results => {
            const itemCount = results.count
            const pageCount = Math.ceil(results.count / req.query.limit)
            return res.send({
                brands: results.rows,
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
                message: error.name,
            })
        })
        .catch(next)
}

exports.create = async (req, res, next) => {

    let {
        brand
    } = req.body

    await BrandModel.create(brand)
        .then(data => {
            return res.status(201).send({
                brand: data,
                success: true,
                message: "Success",
            })
        })
        .catch(error => {
            return res.status(400).send({
                error,
                success: false,
                message: error.name,
            })
        })
}

exports.getOne = async (req, res, next) => {
    const {
        id
    } = req.params

    await BrandModel.findOne({
            where: {
                id: {
                    [Op.eq]: id
                }
            },
        })
        .then(brand => {
            if (!brand) {
                return res.status(404).send({
                    message: "record Not Found",
                    success: false,
                })
            }
            return res.status(200).send({
                brand,
                success: true,
                message: "Success",
            })
        })
        .catch(error => res.status(400).send({
            error,
            success: false,
            message: error.name,
        }))
}

exports.update = async (req, res, next) => {
    const {
        id
    } = req.params
    const {
        brand
    } = req.body

    const brandObj = await BrandModel.findOne({
        where: {
            id: {
                [Op.eq]: id
            }
        },
    }).catch(error => {
        console.log(error)
        return res.status(400).send({
            message: "record Not Found",
            success: false,
        })
    })

    if (!brandObj) {
        return res.status(404).send({
            message: "record Not Found",
            success: false,

        })
    }

    brandObj
        .update(brand)
        .then(data => res.status(200).send({
            data,
            success: true,
            message: "Success",
        }))
        .catch(error => res.status(400).send({
            error,
            success: false,
            message: error.name,
        }))
}

exports.destroy = async (req, res, next) => {
    const {
        id
    } = req.params

    const brand = await BrandModel.findOne({
        where: {
            id: {
                [Op.eq]: id
            }
        },
    }).catch(error => {
        return res.status(400).send({
            error,
            success: false,
            message: error.name,
        })
    })

    if (!brand) {
        return res.status(404).send({
            message: "record Not Found",
            success: false,

        })
    }

    await brand
        .destroy()
        .then(() => res.status(204).send({
            message: "Deleted",
            success: true,
        }))
        .catch(error => res.status(400).send({
            error,
            success: false,
            message: error.name,
        }))
}