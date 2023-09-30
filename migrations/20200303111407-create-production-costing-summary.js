'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('ProductionCostingSummaries', {
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
      plannedQuantity: Sequelize.DECIMAL(16, 4),
      plannedUOMId: Sequelize.INTEGER,
      plannedUnitCost: Sequelize.DECIMAL(16, 4),
      plannedTotalCost: Sequelize.DECIMAL(16, 4),
      plannedComponentCost: Sequelize.DECIMAL(16, 4),
      plannedMachineCost: Sequelize.DECIMAL(16, 4),
      plannedLabourCost: Sequelize.DECIMAL(16, 4),
      actualQuantity: Sequelize.DECIMAL(16, 4),
      actualMachineCost: Sequelize.DECIMAL(16, 4),
      actualTotalLabourCost: Sequelize.DECIMAL(16, 4),
      actualComponentCost: Sequelize.DECIMAL(16, 4),
      actualUnitCost: Sequelize.DECIMAL(16, 4),
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
    return queryInterface.dropTable('ProductionCostingSummaries');
  }
};