'use strict';
module.exports = (sequelize, DataTypes) => {
  const MachineWeekDays = sequelize.define('MachineWeekDays', {
    machineId: DataTypes.INTEGER,
    weekDayId: DataTypes.INTEGER,
  }, {});
  MachineWeekDays.associate = function (models) {
    // associations can be defined here
    MachineWeekDays.belongsTo(models.MachineCenter, {
      foreignKey: "machineId",
    })
    MachineWeekDays.belongsTo(models.WeekDays, {
      foreignKey: "weekDayId",
    })
  };
  return MachineWeekDays;
};