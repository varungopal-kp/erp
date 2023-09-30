'use strict';
module.exports = (sequelize, DataTypes) => {
  const UOMType = sequelize.define('UOMType', {
    name: DataTypes.STRING
  }, {});
  UOMType.associate = function(models) {
    // associations can be defined here
  };
  return UOMType;
};