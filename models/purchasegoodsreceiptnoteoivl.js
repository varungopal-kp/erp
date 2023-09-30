'use strict';
module.exports = (sequelize, DataTypes) => {
  const PurchaseGoodsReceiptNoteOIVL = sequelize.define('PurchaseGoodsReceiptNoteOIVL', {
    purchaseGoodsReceiptNoteId: DataTypes.INTEGER,
    oivlId: DataTypes.INTEGER,
    oivlBarcodeId: DataTypes.INTEGER,
    quantity: DataTypes.DECIMAL(16, 4),
    deletedAt: DataTypes.DATE,
  }, {
    timestamps: true,
    paranoid: true
  });
  PurchaseGoodsReceiptNoteOIVL.associate = function (models) {
    // associations can be defined here
    PurchaseGoodsReceiptNoteOIVL.belongsTo(models.PurchaseGoodsReceiptNote, {
      foreignKey: "purchaseGoodsReceiptNoteId",
    })
    PurchaseGoodsReceiptNoteOIVL.belongsTo(models.OIVL, {
      foreignKey: "oivlId",
    })
    PurchaseGoodsReceiptNoteOIVL.belongsTo(models.OIVLBarcodes, {
      foreignKey: "oivlBarcodeId",
    })
  };
  return PurchaseGoodsReceiptNoteOIVL;
};