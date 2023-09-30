'use strict';
module.exports = (sequelize, DataTypes) => {
  const PurchaseGoodsReceiptNote = sequelize.define('PurchaseGoodsReceiptNote', {
    docNum: {
      type: DataTypes.STRING,
      validate: {
        notEmpty: true,
        isUnique: function (value, next) {
          var self = this
          PurchaseGoodsReceiptNote.findOne({
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
    docDate: DataTypes.DATE,
    postingDate: DataTypes.DATE,
    dueDate: DataTypes.DATE,
    businessPartnerId: DataTypes.INTEGER,
    branchId: DataTypes.INTEGER,
    remarks: DataTypes.STRING,
    billingAddress: DataTypes.JSONB,
    shippingAddress: DataTypes.JSONB,
    totalDiscount: DataTypes.DECIMAL(16, 4),
    totalTax: DataTypes.DECIMAL(16, 4),
    totalBeforeDiscount: DataTypes.DECIMAL(16, 4),
    totalDiscountPercentage: DataTypes.DECIMAL(16, 4),
    totalDiscountSum: DataTypes.DECIMAL(16, 4),
    grandTotal: DataTypes.DECIMAL(16, 4),
    attachments: DataTypes.ARRAY(DataTypes.JSONB),
    currencyId: DataTypes.INTEGER,
    createdUser: DataTypes.UUID,
    deleted: DataTypes.BOOLEAN,
    deletedAt: DataTypes.DATE,
    status: DataTypes.STRING,
    month: DataTypes.INTEGER,
    year: DataTypes.INTEGER,
    quarter: DataTypes.INTEGER,
  }, {
    hooks: {
      afterCreate: function (self, options, fn) {
        return sequelize.models.TransactionNumbers.findOne({
            where: {
              objectCode: "PRN",
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
  PurchaseGoodsReceiptNote.associate = function (models) {
    // associations can be defined here
    PurchaseGoodsReceiptNote.belongsTo(models.BusinessPartner, {
      foreignKey: "businessPartnerId",
    })
    PurchaseGoodsReceiptNote.belongsTo(models.Branch, {
      foreignKey: "branchId",
    })
    PurchaseGoodsReceiptNote.belongsTo(models.Currency, {
      foreignKey: "currencyId",
    })
    PurchaseGoodsReceiptNote.hasMany(models.PurchaseGoodsReceiptNoteItem, {
      foreignKey: "purchaseGoodsReceiptNoteId",
    })
  };
  return PurchaseGoodsReceiptNote;
};