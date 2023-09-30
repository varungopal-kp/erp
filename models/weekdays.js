'use strict';
module.exports = (sequelize, DataTypes) => {
  const WeekDays = sequelize.define('WeekDays', {
    name: DataTypes.STRING
  }, {});
  WeekDays.associate = function(models) {
    // associations can be defined here
  };
  return WeekDays;
};