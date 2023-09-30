'use strict';
module.exports = (sequelize, DataTypes) => {
  const ItemMasterAttribute = sequelize.define('ItemMasterAttribute', {
    itemMasterId: DataTypes.INTEGER,
    itemAttributeId: DataTypes.INTEGER,
    value: DataTypes.STRING,
    uomId: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
  }, {});
  ItemMasterAttribute.associate = function (models) {
    // associations can be defined here
    ItemMasterAttribute.belongsTo(models.ItemMaster, {
        foreignKey: "itemMasterId",
        as: "ItemMaster",
      }),
      ItemMasterAttribute.belongsTo(models.ItemAttribute, {
        foreignKey: "itemAttributeId",
        as: "Attribute",
      }),
      ItemMasterAttribute.belongsTo(models.UOM, {
        foreignKey: "uomId",
        as: "Uom",
      })
  };
  return ItemMasterAttribute;
};