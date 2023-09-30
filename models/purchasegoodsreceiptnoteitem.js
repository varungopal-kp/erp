'use strict';
module.exports = (sequelize, DataTypes) => {
  const PurchaseGoodsReceiptNoteItem = sequelize.define('PurchaseGoodsReceiptNoteItem', {
    purchaseGoodsReceiptNoteId: DataTypes.INTEGER,
    itemMasterId: DataTypes.INTEGER,
    description: DataTypes.STRING,
    warehouseId: DataTypes.INTEGER,
    quantity: DataTypes.DECIMAL(16, 4),
    uomId: DataTypes.INTEGER,
    price: DataTypes.DECIMAL(16, 4),
    discountPercentage: DataTypes.DECIMAL(16, 4),
    discount: DataTypes.DECIMAL(16, 4),
    priceAfterDiscount: DataTypes.DECIMAL(16, 4),
    taxPercentage: DataTypes.DECIMAL(16, 4),
    tax: DataTypes.DECIMAL(16, 4),
    taxableValue: DataTypes.DECIMAL(16, 4),
    total: DataTypes.DECIMAL(16, 4),
  }, {});
  PurchaseGoodsReceiptNoteItem.associate = function (models) {
    // associations can be defined here
    PurchaseGoodsReceiptNoteItem.belongsTo(models.PurchaseGoodsReceiptNote, {
      foreignKey: "purchaseGoodsReceiptNoteId",
    })
    PurchaseGoodsReceiptNoteItem.belongsTo(models.ItemMaster, {
      foreignKey: "itemMasterId",
    })
    PurchaseGoodsReceiptNoteItem.belongsTo(models.Warehouse, {
      foreignKey: "warehouseId",
    })
    PurchaseGoodsReceiptNoteItem.belongsTo(models.UOM, {
      foreignKey: "uomId",
    })
  };
  return PurchaseGoodsReceiptNoteItem;
};