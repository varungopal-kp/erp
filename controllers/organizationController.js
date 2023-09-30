const { check, validationResult } = require("express-validator/check")
const { sanitizeBody } = require("express-validator/filter")
const Sequelize = require("sequelize")
const Op = Sequelize.Op

const Organization = require("../models").Organization
const ErrorUtil = require("../util/Error")

exports.list = async (req, res, next) => { 
    await Organization.findAll({})
      .then(results => {            
        return res.send({
          organizations:results,
          success: true,
          message: "Success",
        }
        )
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
      
    let { organization } = req.body
    
    await Organization.create(organization)
      .then(data => {
        return res.status(201).send({ 
          organization: data,
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
    const { id } = req.params
    
    await Organization.findOne({
      where: { id: { [Op.eq]: id } },
    })
    .then(organization => {
      if (!organization) {
        return res.status(404).send({
          message: "record Not Found",
          success: false,
        })
      }
      return res.status(200).send({
        organization,
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
    const { id } = req.params
    const { organization } = req.body
  
    const organizationObj = await Organization.findOne({
      where: { id: { [Op.eq]: id } },
    }).catch(error => {
      
      return res.status(400).send({
        message: "record Not Found",
        success: false,
      })
    })
    
    if (!organizationObj) {
      return res.status(404).send({
        message: "record Not Found",
        success: false,
      })
    }

    organizationObj
        .update(organization)
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
    const { id } = req.params
    
    const organization = await Organization.findOne({
      where: { id: { [Op.eq]: id } },
    }).catch(error => {
      return res.status(400).send({
        error: error,
        success: false,
            message: "Failed",
      })
    })
  
    if (!organization) {
      return res.status(404).send({
        message: "record Not Found",
        success: false,
        
      })
    }
  
    await organization
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