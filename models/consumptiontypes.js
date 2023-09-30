'use strict';
module.exports = (sequelize, DataTypes) => {
  const ConsumptionType = sequelize.define('ConsumptionType', {
    name: DataTypes.STRING
  }, {});
  ConsumptionType.associate = function (models) {
    // associations can be defined here
  };
  return ConsumptionType;
};