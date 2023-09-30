'use strict';
module.exports = (sequelize, DataTypes) => {
  const ProductionType = sequelize.define('ProductionType', {
    name: DataTypes.STRING
  }, {});
  ProductionType.associate = function (models) {
    // associations can be defined here
  };
  return ProductionType;
};