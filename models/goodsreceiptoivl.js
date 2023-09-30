'use strict';
module.exports = (sequelize, DataTypes) => {
  const GoodsReceiptOIVL = sequelize.define('GoodsReceiptOIVL', {
    goodsReceiptId: DataTypes.INTEGER,
    oivlId: DataTypes.INTEGER,
    oivlBarcodeId: DataTypes.INTEGER,
    quantity: DataTypes.DECIMAL(16, 4),
    deletedAt: DataTypes.DATE,
  }, {
    timestamps: true,
    paranoid: true
  });
  GoodsReceiptOIVL.associate = function (models) {
    // associations can be defined here
    GoodsReceiptOIVL.belongsTo(models.GoodsReceipt, {
      foreignKey: "goodsReceiptId",
    })
    GoodsReceiptOIVL.belongsTo(models.OIVL, {
      foreignKey: "oivlId",
    })
    GoodsReceiptOIVL.belongsTo(models.OIVLBarcodes, {
      foreignKey: "oivlBarcodeId",
    })
  };
  return GoodsReceiptOIVL;
};