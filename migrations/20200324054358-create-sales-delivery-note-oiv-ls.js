'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('SalesDeliveryNoteOIVLs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      salesDeliveryNoteId: {
        type: Sequelize.INTEGER,
        references: {
          model: "SalesDeliveryNotes",
          key: "id",
        },
      },
      oivlId: {
        type: Sequelize.INTEGER,
        references: {
          model: "OIVLs",
          key: "id",
        },
      },
      oivlBarcodeId: {
        type: Sequelize.INTEGER,
        references: {
          model: "OIVLBarcodes",
          key: "id",
        },
      },
      quantity: Sequelize.DECIMAL(16, 4),
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
    return queryInterface.dropTable('SalesDeliveryNoteOIVLs');
  }
};