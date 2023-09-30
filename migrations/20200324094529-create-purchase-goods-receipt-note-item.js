'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('PurchaseGoodsReceiptNoteItems', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      purchaseGoodsReceiptNoteId: {
        type: Sequelize.INTEGER,
        references: {
          model: "PurchaseGoodsReceiptNotes",
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
      description: Sequelize.STRING,
      warehouseId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Warehouses",
          key: "id",
        },
      },
      quantity: Sequelize.DECIMAL(16, 4),
      uomId: {
        type: Sequelize.INTEGER,
        references: {
          model: "UOMs",
          key: "id",
        },
      },
      price: Sequelize.DECIMAL(16, 4),
      discountPercentage: Sequelize.DECIMAL(16, 4),
      discount: Sequelize.DECIMAL(16, 4),
      priceAfterDiscount: Sequelize.DECIMAL(16, 4),
      taxPercentage: Sequelize.DECIMAL(16, 4),
      tax: Sequelize.DECIMAL(16, 4),
      taxableValue: Sequelize.DECIMAL(16, 4),
      total: Sequelize.DECIMAL(16, 4),
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
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('PurchaseGoodsReceiptNoteItems');
  }
};