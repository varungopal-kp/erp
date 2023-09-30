'use strict';
const helper = require('../helpers/helper');
module.exports = (sequelize, DataTypes) => {
  const GoodsIssue = sequelize.define('GoodsIssue', {
    docNum: {
      type: DataTypes.STRING,
      validate: {
        notEmpty: true,
        isUnique: function (value, next) {
          var self = this
          GoodsIssue.findOne({
              where: {
                docNum: value.toString(),
                series: self.series,
              },
            })
            .then(function (user) {
              // reject if a different user wants to use the same docNum
              if (user && self.id !== user.id) {
                return next("docNum already in use!")
              }
              return next()
            })
            .catch(function (err) {
              return next(err)
            })
        },
      },
    },
    series: DataTypes.STRING,
    refNum: DataTypes.STRING,
    docDate: {
      type: DataTypes.DATE,
      // get() {
      //   return helper.formatDate(this.getDataValue('docDate'))
      // }
    },
    postingDate: {
      type: DataTypes.DATE,
      // get() {
      //   return helper.formatDate(this.getDataValue('postingDate'))
      // }
    },
    total: DataTypes.DECIMAL(16, 4),
    remarks: DataTypes.STRING,
    createdBy: DataTypes.INTEGER,
    deleted: DataTypes.BOOLEAN,
    statusId: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
    month: DataTypes.INTEGER,
    year: DataTypes.INTEGER,
    quarter: DataTypes.INTEGER,
  }, {
    hooks: {
      afterCreate: function (self, options, fn) {
        return sequelize.models.TransactionNumbers.findOne({
            where: {
              objectCode: "GIS",
              nextNumber: self.docNum,
              series: self.series,
            },
          })
          .then(res => {
            res
              .update({
                nextNumber: res.nextNumber + 1,
              })
              .catch(error => {
                console.log(error)
                return Promise.reject(new Error(" Transaction Number updating fails"))
              })
          })
          .catch(errors => {
            console.log(`No document number with next number ${self.docNum}`)
            // return Promise.reject(new Error(`No document number with next number ${self.docNum}`))
          })
      },
    },
  });
  GoodsIssue.associate = function (models) {
    // associations can be defined here
    GoodsIssue.belongsTo(models.Branch, {
        foreignKey: "branchId",
        as: "Branch",
      }),
      GoodsIssue.hasMany(models.GoodsIssueItem, {
        foreignKey: "goodsIssueId",
        as: "GoodsIssueItems",
      }),
      GoodsIssue.belongsTo(models.Status, {
        foreignKey: "statusId",
        as: "status",
      })
  };
  return GoodsIssue;
};