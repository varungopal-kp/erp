'use strict';
module.exports = (sequelize, DataTypes) => {
  const ItemCategoryType = sequelize.define('ItemCategoryType', {
    code: DataTypes.STRING,
    name: DataTypes.STRING,
  }, {});
  ItemCategoryType.associate = function(models) {
    // associations can be defined here
  };
  return ItemCategoryType;
};