'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('ProductionReceiptItems', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      productionReceiptId: {
        type: Sequelize.INTEGER,
        references: {
          model: "ProductionReceipts",
          key: "id",
        },
      },
      productId: {
        type: Sequelize.INTEGER,
        references: {
          model: "ItemMasters",
          key: "id",
        },
      },
      description: Sequelize.STRING,
      warehouseId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Warehouses",
          key: "id",
        },
      },
      type: Sequelize.STRING,
      receiptQuantity: Sequelize.DECIMAL(16, 4),
      plannedQuantity: Sequelize.DECIMAL(16, 4),
      completedQuantity: Sequelize.DECIMAL(16, 4),
      rejectionQuantity: Sequelize.DECIMAL(16, 4),
      unitCost: Sequelize.DECIMAL(16, 4),
      total: Sequelize.DECIMAL(16, 4),
      uomId: {
        type: Sequelize.INTEGER,
        references: {
          model: "UOMs",
          key: "id",
        },
      },
      managementTypeId: Sequelize.INTEGER,
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
    return queryInterface.dropTable('ProductionReceiptItems');
  }
};