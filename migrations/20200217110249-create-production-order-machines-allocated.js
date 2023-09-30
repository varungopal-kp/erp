'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('ProductionOrderMachinesAllocations', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      productionOrderId: {
        type: Sequelize.INTEGER,
        references: {
          model: "ProductionOrders",
          key: "id",
        },
      },
      machineId: {
        type: Sequelize.INTEGER,
        references: {
          model: "MachineCenters",
          key: "id",
        },
      },
      date: Sequelize.DATE,
      numberOfHours: Sequelize.DECIMAL(16, 4),
      status: Sequelize.STRING,
      productionUnitId: {
        type: Sequelize.INTEGER,
        references: {
          model: "ProductionUnits",
          key: "id",
        },
      },
      month: Sequelize.INTEGER,
      year: Sequelize.INTEGER,
      quarter: Sequelize.INTEGER,
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
    return queryInterface.dropTable('ProductionOrderMachinesAllocations');
  }
};