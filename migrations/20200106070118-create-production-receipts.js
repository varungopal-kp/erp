'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('ProductionReceipts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      docNum: Sequelize.STRING,
      series: Sequelize.STRING,
      docDate: Sequelize.DATE,
      branchId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Branches",
          key: "id",
        },
      },
      productionOrderId: {
        type: Sequelize.INTEGER,
        references: {
          model: "ProductionOrders",
          key: "id",
        },
      },
      remarks: Sequelize.STRING,
      grandTotal: Sequelize.DECIMAL(16, 4),
      totalQty: Sequelize.DECIMAL(16, 4),
      createdUser: Sequelize.UUID,
      month: Sequelize.INTEGER,
      year: Sequelize.INTEGER,
      quarter: Sequelize.INTEGER,
      deleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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
      },
      deletedAt: {
        type: Sequelize.DATE,
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('ProductionReceipts');
  }
};