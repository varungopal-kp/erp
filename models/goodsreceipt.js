'use strict';
const helper = require('../helpers/helper');
module.exports = (sequelize, DataTypes) => {
  const GoodsReceipt = sequelize.define('GoodsReceipt', {
    docNum: {
      type: DataTypes.STRING,
      validate: {
        notEmpty: true,
        isUnique: function (value, next) {
          var self = this
          GoodsReceipt.findOne({
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
              objectCode: "GRT",
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
  GoodsReceipt.associate = function (models) {
    // associations can be defined here
    GoodsReceipt.belongsTo(models.Branch, {
        foreignKey: "branchId",
        as: "Branch",
      }),
      GoodsReceipt.hasMany(models.GoodsReceiptItem, {
        foreignKey: "goodsReceiptId",
        as: "GoodsReceiptItems",
      }),
      GoodsReceipt.belongsTo(models.Status, {
        foreignKey: "statusId",
        as: "status",
      })
  };
  return GoodsReceipt;
};