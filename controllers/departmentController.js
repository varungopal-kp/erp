const Sequelize = require("sequelize")
const Op = Sequelize.Op
const paginate = require("express-paginate")
const DepartmentModel = require("../models").Department
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

    await DepartmentModel.findAndCountAll({
            include: [{
                model: Branch,
                as: "branch",
                attributes: ["name"]
            }, ],
            distinct: true,
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
                departments: results.rows,
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
        department
    } = req.body

    await DepartmentModel.create(department)
        .then(data => {
            return res.status(201).send({
                department: data,
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

    await DepartmentModel.findOne({
            where: {
                id: {
                    [Op.eq]: id
                }
            },
        })
        .then(department => {
            if (!department) {
                return res.status(404).send({
                    message: "record Not Found",
                    success: false,
                })
            }
            return res.status(200).send({
                department,
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
        department
    } = req.body

    const departmentObj = await DepartmentModel.findOne({
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

    if (!departmentObj) {
        return res.status(404).send({
            message: "record Not Found",
            success: false,

        })
    }

    departmentObj
        .update(department)
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

    const department = await DepartmentModel.findOne({
        where: {
            id: {
                [Op.eq]: id
            }
        },
    }).catch(error => {
        return res.status(400).send({
            error,
            success: false,
            message: "Failed",
        })
    })

    if (!department) {
        return res.status(404).send({
            message: "record Not Found",
            success: false,

        })
    }

    await department
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