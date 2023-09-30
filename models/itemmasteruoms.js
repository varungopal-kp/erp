"use strict";
module.exports = (sequelize, DataTypes) => {
  const ItemMasterUOMs = sequelize.define(
    "ItemMasterUOMs", {
      uomId: DataTypes.INTEGER,
      itemMasterId: DataTypes.INTEGER,
      conversionFactor: DataTypes.DECIMAL(16, 4)
    }, {}
  );
  ItemMasterUOMs.associate = function (models) {
    // associations can be defined here
    ItemMasterUOMs.belongsTo(models.ItemMaster, {
      foreignKey: "itemMasterId"
    })
    ItemMasterUOMs.belongsTo(models.UOM, {
      foreignKey: "uomId"
    })
  };
  return ItemMasterUOMs;
};