'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('WarehouseItems', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      itemMasterId: {
        type: Sequelize.INTEGER,
        references: {
          model: "ItemMasters",
          key: "id",
        },
        onDelete: "cascade",
        onUpdate: "cascade",
      },
      warehouseId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Warehouses",
          key: "id",
        },
        onDelete: "cascade",
        onUpdate: "cascade",
      },
      onHand: {
        type: Sequelize.DECIMAL(16, 4),
      },
      onOrder: {
        type: Sequelize.DECIMAL(16, 4),
      },
      commited: {
        type: Sequelize.DECIMAL(16, 4),
      },
      minStock: {
        type: Sequelize.DECIMAL(16, 4),
      },
      maxStock: {
        type: Sequelize.DECIMAL(16, 4),
      },
      minOrder: {
        type: Sequelize.DECIMAL(16, 4),
      },
      maxOrder: {
        type: Sequelize.DECIMAL(16, 4),
      },
      price: {
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
    return queryInterface.dropTable('WarehouseItems');
  }
};