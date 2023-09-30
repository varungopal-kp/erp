'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('ProductionOrderLabours', {
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
      employeeId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Employees",
          key: "id",
        },
      },
      estimatedTime: Sequelize.DECIMAL(16, 4),
      costPerHour: Sequelize.DECIMAL(16, 4),
      startDate: Sequelize.DATE,
      endDate: Sequelize.DATE,
      totalCost: Sequelize.DECIMAL(16, 4),
      remarks: Sequelize.STRING,
      actualTotalTime: Sequelize.DECIMAL(16, 4),
      actualTotalCost: Sequelize.DECIMAL(16, 4),
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
    return queryInterface.dropTable('ProductionOrderLabours');
  }
};