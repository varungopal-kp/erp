'use strict';
module.exports = (sequelize, DataTypes) => {
  const SalesDeliveryNoteItem = sequelize.define('SalesDeliveryNoteItem', {
    salesDeliveryNoteId: DataTypes.INTEGER,
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
  SalesDeliveryNoteItem.associate = function (models) {
    // associations can be defined here
    SalesDeliveryNoteItem.belongsTo(models.SalesDeliveryNote, {
      foreignKey: "salesDeliveryNoteId",
    })
    SalesDeliveryNoteItem.belongsTo(models.ItemMaster, {
      foreignKey: "itemMasterId",
    })
    SalesDeliveryNoteItem.belongsTo(models.Warehouse, {
      foreignKey: "warehouseId",
    })
    SalesDeliveryNoteItem.belongsTo(models.UOM, {
      foreignKey: "uomId",
    })
  };
  return SalesDeliveryNoteItem;
};