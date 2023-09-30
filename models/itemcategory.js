'use strict';
module.exports = (sequelize, DataTypes) => {
  const ItemCategory = sequelize.define('ItemCategory', {
    code: DataTypes.STRING,
    name: DataTypes.STRING,
    categoryTypeId: DataTypes.INTEGER,
    parentCategoryId: DataTypes.INTEGER,
    statusId: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
  }, {
    timestamps: true,
    paranoid: true
  });
  ItemCategory.associate = function (models) {
    // associations can be defined here
    ItemCategory.belongsTo(models.ItemCategoryType, {
        foreignKey: "categoryTypeId"
      }),
      ItemCategory.belongsTo(models.ItemCategory, {
        foreignKey: "parentCategoryId",
        as: "parentCategory",
      }),
      ItemCategory.belongsTo(models.Status, {
        foreignKey: "statusId",
        as: "status",
      })
  };
  return ItemCategory;
};