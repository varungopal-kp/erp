const Sequelize = require("sequelize")
const Op = Sequelize.Op
const paginate = require("express-paginate")
const Branch = require("../models").Branch

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

    await Branch.findAndCountAll({
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
                branches: results.rows,
                success: true,
                message: "Success",
                pageCount,
                itemCount,
                pages: paginate.getArrayPages(req)(3, pageCount, req.query.page),
            })
        })
        .catch(error => {
            return res.status(400).send({
                success: false,
                message: error.name,
                error
            })
        })
        .catch(next)
}

exports.create = async (req, res, next) => {

    let {
        branch
    } = req.body

    await Branch.create(branch)
        .then(result => {
            return res.status(201).send({
                branch: result,
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

    await Branch.findOne({
            where: {
                id: {
                    [Op.eq]: id
                }
            },
        })
        .then(branch => {
            if (!branch) {
                return res.status(404).send({
                    message: "record Not Found",
                    success: false,
                })
            }
            return res.status(200).send({
                branch,
                success: true,
                message: "Success",
            })
        })
        .catch(error => res.status(400).send({
            error,
            success: true,
            message: "Success",
        }))
}

exports.update = async (req, res, next) => {
    const {
        id
    } = req.params
    const {
        branch
    } = req.body

    const branchObj = await Branch.findOne({
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

    if (!branchObj) {
        return res.status(404).send({
            message: "record Not Found",
            success: false,
        })
    }

    branchObj
        .update(branch)
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

    const branch = await Branch.findOne({
        where: {
            id: {
                [Op.eq]: id
            }
        },
    }).catch(error => {
        return res.status(400).send({
            message: error,
            success: false,
            message: "Failed",
        })
    })

    if (!branch) {
        return res.status(404).send({
            message: "record Not Found",
            success: false,
        })
    }

    await branch
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