'use strict';
module.exports = (sequelize, DataTypes) => {
  const MachineRoutingStages = sequelize.define('MachineRoutingStages', {
    machineId: DataTypes.INTEGER,
    routingStageId: DataTypes.INTEGER,
  }, {});
  MachineRoutingStages.associate = function (models) {
    // associations can be defined here
    MachineRoutingStages.belongsTo(models.MachineCenter, {
      foreignKey: "machineId",
    })
    MachineRoutingStages.belongsTo(models.RoutingStages, {
      foreignKey: "routingStageId",
    })
  };
  return MachineRoutingStages;
};