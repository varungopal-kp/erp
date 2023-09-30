'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('InventoryTransferItems', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      inventoryTransferId: {
        type: Sequelize.INTEGER
      },
      itemMasterId: {
        type: Sequelize.INTEGER
      },
      quantity: {
        type: Sequelize.DECIMAL(16, 4),
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        onUpdate: Sequelize.literal("CURRENT_TIMESTAMP"),
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('InventoryTransferItems');
  }
};