"use strict";
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable("MachineCenters", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      no: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
      },
      workCenterId: {
        type: Sequelize.INTEGER
      },
      directUnitCost: {
        type: Sequelize.DECIMAL(16, 4)
      },
      inDirectUnitCost: {
        type: Sequelize.DECIMAL(16, 4)
      },
      unitCost: {
        type: Sequelize.DECIMAL(16, 4)
      },
      overheadRate: {
        type: Sequelize.DECIMAL(16, 4)
      },
      fushingMethod: {
        type: Sequelize.STRING
      },
      postingGroup: {
        type: Sequelize.STRING
      },
      capacity: {
        type: Sequelize.INTEGER
      },
      uomId: {
        type: Sequelize.INTEGER
      },
      queueTime: {
        type: Sequelize.STRING
      },
      efficiency: {
        type: Sequelize.STRING
      },
      queueTimeUOM: {
        type: Sequelize.STRING
      },

      setupTime: {
        type: Sequelize.STRING
      },
      waitTime: {
        type: Sequelize.STRING
      },
      moveTime: {
        type: Sequelize.STRING
      },
      sendQty: {
        type: Sequelize.STRING
      },
      minProcessTime: {
        type: Sequelize.STRING
      },
      maxProcessTime: {
        type: Sequelize.STRING
      },
      concurrentCapacity: {
        type: Sequelize.STRING
      },

      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        onUpdate: Sequelize.literal("CURRENT_TIMESTAMP")
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable("MachineCenters");
  }
};