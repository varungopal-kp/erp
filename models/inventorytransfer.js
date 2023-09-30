'use strict';
const helper = require('../helpers/helper');
module.exports = (sequelize, DataTypes) => {
  const InventoryTransfer = sequelize.define('InventoryTransfer', {
    docNum: {
      type: DataTypes.STRING,
      validate: {
        notEmpty: true,
        isUnique: function (value, next) {
          var self = this
          InventoryTransfer.findOne({
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
    fromWarehouseId: DataTypes.INTEGER,
    toWarehouseId: DataTypes.INTEGER,
    branchId: DataTypes.INTEGER,
    postingAt: {
      type: DataTypes.DATE,
      // get() {
      //   return helper.formatDate(this.getDataValue('postingAt'))
      // }
    },
    documentedAt: {
      type: DataTypes.DATE,
      // get() {
      //   return helper.formatDate(this.getDataValue('documentedAt'))
      // }
    },
    remarks: DataTypes.STRING,
    deleted: DataTypes.BOOLEAN,
    statusId: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
  }, {
    hooks: {
      afterCreate: function (self, options, fn) {
        return sequelize.models.TransactionNumbers.findOne({
            where: {
              objectCode: "INT",
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
            // // returning a reject promise will keep the promise in the reject state
            // return Promise.reject(
            //   new Error(`No document number with next number ${self.docNum}`),
            // )
            console.log(`No document number with next number ${self.docNum}`)
          })
      },
    },
  });
  InventoryTransfer.associate = function (models) {
    // associations can be defined here
    InventoryTransfer.belongsTo(models.Warehouse, {
        foreignKey: "fromWarehouseId",
        as: "FromWarehouse",
      }),
      InventoryTransfer.belongsTo(models.Warehouse, {
        foreignKey: "toWarehouseId",
        as: "ToWarehouse",
      }),
      InventoryTransfer.belongsTo(models.Branch, {
        foreignKey: "branchId",
        as: "Branch",
      }),
      InventoryTransfer.hasMany(models.InventoryTransferItems, {
        foreignKey: "inventoryTransferId",
        as: "InventoryTransferItem",
      }),
      InventoryTransfer.belongsTo(models.Status, {
        foreignKey: "statusId",
        as: "status",
      })
  };
  return InventoryTransfer;
};