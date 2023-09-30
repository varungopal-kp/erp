"use strict";
module.exports = (sequelize, DataTypes) => {
  const WorkCenter = sequelize.define(
    "WorkCenter", {
      code: DataTypes.STRING,
      name: DataTypes.STRING,
      unitId: DataTypes.INTEGER,
      workCenterId: DataTypes.INTEGER,
      workCenterGroupId: DataTypes.INTEGER,
      uomId: DataTypes.INTEGER,
      capacity: DataTypes.INTEGER,
      directCost: DataTypes.STRING,
      indirectCost: DataTypes.STRING,
      overheadCost: DataTypes.STRING,
      productionConsumptionId: DataTypes.INTEGER,
      deletedAt: DataTypes.DATE,
    }, {}
  );
  WorkCenter.associate = function (models) {
    // associations can be defined here
    WorkCenter.belongsTo(models.WorkCenter, {
      foreignKey: "workCenterId",
      as: "AlternativeWorkCenter"
    })
    WorkCenter.belongsTo(models.WorkCenterGroup, {
      foreignKey: "workCenterGroupId"
    })
    WorkCenter.belongsTo(models.ProductionUnit, {
      foreignKey: "unitId"
    })
    WorkCenter.belongsTo(models.UOM, {
      foreignKey: "uomId"
    })
    WorkCenter.belongsTo(models.ProductionType, {
      foreignKey: "productionConsumptionId",
    })
  };
  return WorkCenter;
};