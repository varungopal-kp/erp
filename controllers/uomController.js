const Sequelize = require("sequelize")
const Op = Sequelize.Op
const paginate = require("express-paginate")

const UOMModel = require("../models").UOM
const UOMType = require("../models").UOMType

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

    if (req.query.type) {
        let uomTypeId
        switch (req.query.type) {
            case "weight":
                uomTypeId = 1
                break;

            case "area":
                uomTypeId = 2
                break;
            default:
                break;
        }
        filter.push({
            uomTypeId: uomTypeId
        })
    }

    await UOMModel.findAndCountAll({
            // distinct: true,
            limit: req.query.limit,
            offset: req.skip,
            where: filter,
            order: [
                ['id', 'DESC']
            ],
            include: [{
                model: UOMType,
                attributes: ["name"]
            }]
        })
        .then(results => {
            const itemCount = results.count
            const pageCount = Math.ceil(results.count / req.query.limit)
            return res.send({
                uoms: results.rows,
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
        uom
    } = req.body

    await UOMModel.create(uom)
        .then(data => {
            return res.status(201).send({
                uom: data,
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

    await UOMModel.findOne({
            where: {
                id: {
                    [Op.eq]: id
                }
            },
        })
        .then(uom => {
            if (!uom) {
                return res.status(404).send({
                    message: "record Not Found",
                    success: false,
                })
            }
            return res.status(200).send({
                uom,
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
        uom
    } = req.body

    const uomObj = await UOMModel.findOne({
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

    if (!uomObj) {
        return res.status(404).send({
            message: "record Not Found",
            success: false,
        })
    }

    uomObj
        .update(uom)
        .then(data => res.status(200).send({
            data,
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

    const uom = await UOMModel.findOne({
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

    if (!uom) {
        return res.status(404).send({
            message: "record Not Found",
            success: false,
        })
    }

    await uom
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