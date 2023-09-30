'use strict';
module.exports = (sequelize, DataTypes) => {
  const RoutingStages = sequelize.define('RoutingStages', {
    name: DataTypes.STRING
  }, {});
  RoutingStages.associate = function(models) {
    // associations can be defined here
  };
  return RoutingStages;
};