'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('PurchasePlans', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      salesOrderId: {
        type: Sequelize.INTEGER,
        references: {
          model: "SalesOrders",
          key: "id",
        },
      },
      salesOrderItemId: {
        type: Sequelize.INTEGER,
        references: {
          model: "SalesOrderItems",
          key: "id",
        },
      },
      itemMasterId: {
        type: Sequelize.INTEGER,
        references: {
          model: "ItemMasters",
          key: "id",
        },
      },
      quantity: Sequelize.DECIMAL(16, 4),
      uomId: Sequelize.INTEGER,
      salesOrderPlanId: {
        type: Sequelize.INTEGER,
        references: {
          model: "SalesOrderPlans",
          key: "id",
        },
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
    return queryInterface.dropTable('PurchasePlans');
  }
};