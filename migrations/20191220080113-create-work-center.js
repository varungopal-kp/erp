"use strict";
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable("WorkCenters", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      code: {
        type: Sequelize.STRING
      },
      name: {
        type: Sequelize.STRING
      },
      unitId: {
        type: Sequelize.INTEGER
      },
      workCenterId: {
        type: Sequelize.INTEGER
      },
      workCenterGroupId: {
        type: Sequelize.INTEGER
      },
      uomId: {
        type: Sequelize.INTEGER
      },
      capacity: {
        type: Sequelize.INTEGER
      },
      directCost: {
        type: Sequelize.STRING
      },
      indirectCost: {
        type: Sequelize.STRING
      },
      overheadCost: {
        type: Sequelize.STRING
      },
      productionConsumptionId: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable("WorkCenters");
  }
};
