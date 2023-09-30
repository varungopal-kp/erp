'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('SalesDeliveryNoteBundles', {
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
      oivlBundleId: {
        type: Sequelize.INTEGER,
        references: {
          model: "OIVLBundleNumbers",
          key: "id",
        },
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
      },
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('SalesDeliveryNoteBundles');
  }
};