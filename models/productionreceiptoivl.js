'use strict';
module.exports = (sequelize, DataTypes) => {
  const ProductionReceiptOIVL = sequelize.define('ProductionReceiptOIVL', {
    productionReceiptId: DataTypes.INTEGER,
    oivlId: DataTypes.INTEGER,
    oivlBarcodeId: DataTypes.INTEGER,
    quantity: DataTypes.DECIMAL(16, 4),
    deletedAt: DataTypes.DATE,
  }, {
    timestamps: true,
    paranoid: true
  });
  ProductionReceiptOIVL.associate = function (models) {
    // associations can be defined here
    ProductionReceiptOIVL.belongsTo(models.ProductionReceipt, {
      foreignKey: "productionReceiptId",
    })
    ProductionReceiptOIVL.belongsTo(models.OIVL, {
      foreignKey: "oivlId",
    })
    ProductionReceiptOIVL.belongsTo(models.OIVLBarcodes, {
      foreignKey: "oivlBarcodeId",
    })
  };
  return ProductionReceiptOIVL;
};