'use strict';
module.exports = (sequelize, DataTypes) => {
  const ItemAttribute = sequelize.define('ItemAttribute', {
    code: DataTypes.STRING,
    name: DataTypes.STRING,
    itemCategoryId: DataTypes.INTEGER,
    statusId: DataTypes.INTEGER,
    type: DataTypes.STRING,
    deletedAt: DataTypes.DATE,
  }, {});
  ItemAttribute.associate = function (models) {
    // associations can be defined here
    ItemAttribute.belongsTo(models.ItemCategory, {
        foreignKey: "itemCategoryId",
      }),
      ItemAttribute.belongsTo(models.Status, {
        foreignKey: "statusId",
        as: "status",
      })
  };
  return ItemAttribute;
};