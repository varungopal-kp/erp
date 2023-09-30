'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('ProductionOrderLabourDates', {
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
      productionOrderLabourId: {
        type: Sequelize.INTEGER,
        references: {
          model: "ProductionOrderLabours",
          key: "id",
        },
      },
      startDate: Sequelize.DATE,
      endDate: Sequelize.DATE,
      numberOfHours: Sequelize.DECIMAL(16, 4),
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
    return queryInterface.dropTable('ProductionOrderLabourDates');
  }
};