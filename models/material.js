'use strict';
module.exports = (sequelize, DataTypes) => {
  const Material = sequelize.define('Material', {
    name: DataTypes.STRING
  }, {});
  Material.associate = function(models) {
    // associations can be defined here
  };
  return Material;
};