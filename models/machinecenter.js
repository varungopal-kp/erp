"use strict";
module.exports = (sequelize, DataTypes) => {
  const MachineCenter = sequelize.define(
    "MachineCenter", {
      no: {
        type: DataTypes.STRING,
        unique: true
      },
      name: {
        type: DataTypes.STRING,
        unique: true
      },
      workCenterId: {
        type: DataTypes.INTEGER
      },
      directUnitCost: {
        type: DataTypes.DECIMAL(16, 4)
      },
      inDirectUnitCost: {
        type: DataTypes.DECIMAL(16, 4)
      },
      unitCost: {
        type: DataTypes.DECIMAL(16, 4)
      },
      overheadRate: {
        type: DataTypes.DECIMAL(16, 4)
      },
      productionConsumptionId: {
        type: DataTypes.INTEGER
      },
      postingGroup: {
        type: DataTypes.STRING
      },
      capacity: {
        type: DataTypes.DECIMAL(16, 2)
      },
      uomId: {
        type: DataTypes.INTEGER
      },
      queueTime: {
        type: DataTypes.STRING
      },
      efficiency: {
        type: DataTypes.STRING
      },
      queueTimeUOM: {
        type: DataTypes.STRING
      },

      setupTime: {
        type: DataTypes.STRING
      },
      waitTime: {
        type: DataTypes.STRING
      },
      moveTime: {
        type: DataTypes.STRING
      },
      runTime: {
        type: DataTypes.DECIMAL(16, 4)
      },
      sendQty: {
        type: DataTypes.STRING
      },
      minProcessTime: {
        type: DataTypes.STRING
      },
      maxProcessTime: {
        type: DataTypes.STRING
      },
      concurrentCapacity: {
        type: DataTypes.STRING
      },
      deletedAt: DataTypes.DATE,
    }, {}
  );
  MachineCenter.associate = function (models) {
    // associations can be defined here
    MachineCenter.belongsTo(models.WorkCenter, {
      foreignKey: "workCenterId",
    })
    MachineCenter.belongsTo(models.ProductionType, {
      foreignKey: "productionConsumptionId",
    })
    MachineCenter.belongsTo(models.UOM, {
      foreignKey: "uomId",
    })
    MachineCenter.hasMany(models.MachineWeekDays, {
      foreignKey: "machineId",
    })
    MachineCenter.hasMany(models.MachineRoutingStages, {
      foreignKey: "machineId",
    })
  };
  return MachineCenter;
};