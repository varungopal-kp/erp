const Sequelize = require("sequelize")
const Op = Sequelize.Op

const TransactionNumberModel = require("../models").TransactionNumbers

exports.list = async (req, res, next) => {
    let filter = []

    if (req.query.type) {
        filter.push({
            objectCode: {
                [Op.eq]: req.query.type
            }
        })
    }

    if (req.query.series) {
        filter.push({
            series: {
                [Op.eq]: req.query.series
            }
        })
    }

    console.log(filter)
    await TransactionNumberModel.findAll({
            where: filter
        })
        .then(results => {
            return res.send({
                transactionNumbers: results,
                success: true,
                message: "Success",
            })
        })
        .catch(error => {
            return res.status(400).send({
                error: error,
                success: false,
                message: "Failed",
            })
        })
        .catch(next)
}

exports.filteredList = async (req, res, next) => {

    const type = req.query.type
    const series = req.query.series

    await TransactionNumberModel.findOne({
            where: {
                objectCode: {
                    [Op.eq]: type
                },
                series: {
                    [Op.eq]: series
                }
            },
        })
        .then(results => {
            return res.send({
                transactionNumbers: results,
                success: true,
                message: "Success",
            })
        })
        .catch(error => {
            return res.status(400).send({
                error: error,
                success: false,
                message: "Failed",
            })
        })
        .catch(next)
}