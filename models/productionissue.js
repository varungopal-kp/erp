'use strict';
module.exports = (sequelize, DataTypes) => {
  const ProductionIssue = sequelize.define('ProductionIssue', {
    docNum: DataTypes.STRING,
    series: DataTypes.STRING,
    docDate: DataTypes.DATE,
    branchId: DataTypes.INTEGER,
    productionOrderId: DataTypes.INTEGER,
    remarks: DataTypes.STRING,
    createdUser: DataTypes.UUID,
    deleted: DataTypes.BOOLEAN,
    deletedAt: DataTypes.DATE,
    grandTotal: DataTypes.DECIMAL(16, 4),
    month: DataTypes.INTEGER,
    year: DataTypes.INTEGER,
    quarter: DataTypes.INTEGER,
    productionReceiptId: DataTypes.INTEGER,
  }, {
    hooks: {
      afterCreate: function (self, options, fn) {
        return sequelize.models.TransactionNumbers.findOne({
            where: {
              objectCode: "PIS",
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
  ProductionIssue.associate = function (models) {
    // associations can be defined here
    ProductionIssue.belongsTo(models.ProductionOrder, {
      foreignKey: "productionOrderId",
    })
    ProductionIssue.hasMany(models.ProductionIssueItems, {
      foreignKey: "productionIssueId",
    })
    ProductionIssue.hasMany(models.ProductionIssueOIVLs, {
      foreignKey: "productionIssueId",
    })
  };
  return ProductionIssue;
};