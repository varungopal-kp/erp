'use strict';
module.exports = (sequelize, DataTypes) => {
  const WorkCenterGroup = sequelize.define('WorkCenterGroup', {
    name: DataTypes.STRING,
    deletedAt: DataTypes.DATE,
  }, {});
  WorkCenterGroup.associate = function (models) {
    // associations can be defined here
  };
  return WorkCenterGroup;
};