const PurchaseRequest = require("../models").PurchaseRequest
const PurchaseRequestItem = require("../models").PurchaseRequestItem
const ConsumptionType = require("../models").ConsumptionType
const Country = require("../models").Country
const Currency = require("../models").Currency
const RoutingStages = require("../models").RoutingStages
const PurchasePlan = require("../models").PurchasePlan
const SalesOrder = require("../models").SalesOrder
const SalesOrderItem = require("../models").SalesOrderItem
const ItemMaster = require("../models").ItemMaster
const Module = require("../models").Module
const UOM = require("../models").UOM
const UOMType = require("../models").UOMType
const Material = require("../models").Material
const ItemManagementType = require("../models").ItemManagementType
const Sequelize = require("sequelize")
var moment = require('moment');
const paginate = require("express-paginate")

const Op = Sequelize.Op

module.exports = {

  async documentNumList(req, res) {
    await PurchaseRequest.findAll()
      .then(doc => res.status(200).send({
        doc
      }))
      .catch(error => res.status(400).send({
        error
      }))
  },
  async documentData(req, res) {
    const {
      id
    } = req.params
    await PurchaseRequest.findOne({
        where: {
          docNum: {
            [Op.eq]: id
          }
        },
        include: [{
          model: PurchaseRequestItem,
        }, ]
      })
      .then(data => {
        if (data) {
          let doc = data.toJSON()
          doc.LineItems = doc.PurchaseRequestItems
          doc.landedCost = [{
            amount: 12
          }]
          delete doc.PurchaseRequestItems
          doc.LineItems = [{
                reqDate: moment()
              },
              {
                reqDate: moment()
              },
              {
                reqDate: moment()
              },
              {
                reqDate: moment()
              },
              {
                reqDate: moment()
              },
              {
                reqDate: moment()
              },
            ],
            res.status(200).send({
              doc
            })
        }

      })
      .catch(error => res.status(400).send(console.log(error)))
  },
  async productionConsumptionList(req, res, next) {

    await ConsumptionType.findAll({
        attributes: ["id", "name"]
      })
      .then(result => {
        if (!result) {
          return res.status(404).send({
            message: "records Not Found",
            success: false,
          })
        }
        return res.status(200).send({
          consumptionTypes: result,
          success: true,
          message: "Success",
        })
      })
      .catch(error => res.status(400).send({
        error,
        success: false,
        message: "Failed",
      }))
  },
  async countryList(req, res) {
    await Country.findAll()
      .then(results =>
        res.status(200).send({
          countries: results,
          success: true,
          message: "success"
        }),
      )
      .catch(error =>
        res.status(400).send({
          error,
          success: false,
          message: "failed"
        }),
      )
  },
  async currencyList(req, res) {
    await Currency.findAll()
      .then(results =>
        res.status(200).send({
          currencies: results,
          success: true,
          message: "success"
        }),
      )
      .catch(error =>
        res.status(400).send({
          error,
          success: false,
          message: "failed"
        }),
      )
  },
  async routingStagesList(req, res) {
    await RoutingStages.findAll()
      .then(results =>
        res.status(200).send({
          routingStages: results,
          success: true,
          message: "success"
        }),
      )
      .catch(error =>
        res.status(400).send({
          error,
          success: false,
          message: "failed"
        }),
      )
  },
  async modulesList(req, res) {
    await Module.findAll({
        order: [
          ['id', 'ASC']
        ],
      })
      .then(results =>
        res.status(200).send({
          modules: results,
          success: true,
          message: "success"
        }),
      )
      .catch(error =>
        res.status(400).send({
          error,
          success: false,
          message: "failed"
        }),
      )
  },
  async uomTypeList(req, res) {
    await UOMType.findAll({
        order: [
          ['id', 'ASC']
        ],
        attributes: ["id", "name"]
      })
      .then(results =>
        res.status(200).send({
          uomTypes: results,
          success: true,
          message: "success"
        }),
      )
      .catch(error =>
        res.status(400).send({
          error,
          success: false,
          message: "failed"
        }),
      )
  },
  async itemMaterialList(req, res) {
    await Material.findAll({
        order: [
          ['id', 'ASC']
        ],
        attributes: ["id", "name"]
      })
      .then(results =>
        res.status(200).send({
          materials: results,
          success: true,
          message: "success"
        }),
      )
      .catch(error =>
        res.status(400).send({
          error,
          success: false,
          message: "failed"
        }),
      )
  },
  async itemManagementTypeList(req, res) {
    await ItemManagementType.findAll({
        order: [
          ['id', 'ASC']
        ],
        attributes: ["id", "name"]
      })
      .then(results =>
        res.status(200).send({
          managementTypes: results,
          success: true,
          message: "success"
        }),
      )
      .catch(error =>
        res.status(400).send({
          error,
          success: false,
          message: "failed"
        }),
      )
  },
}