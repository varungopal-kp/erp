'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('OIVLs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      docNum: {
        type: Sequelize.STRING
      },
      docType: {
        type: Sequelize.STRING
      },
      documentId: Sequelize.INTEGER,
      itemMasterId: {
        type: Sequelize.INTEGER,
        references: {
          model: "ItemMasters",
          key: "id",
        },
      },
      warehouseId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Warehouses",
          key: "id",
        },
      },
      inQty: {
        type: Sequelize.DECIMAL(16, 4)
      },
      outQty: {
        type: Sequelize.DECIMAL(16, 4)
      },
      openQty: {
        type: Sequelize.DECIMAL(16, 4)
      },
      price: {
        type: Sequelize.DECIMAL(16, 4)
      },
      cost: {
        type: Sequelize.DECIMAL(16, 4)
      },
      currencyId: {
        type: Sequelize.INTEGER
      },
      deleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      barcode: {
        type: Sequelize.STRING
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
    return queryInterface.dropTable('OIVLs');
  }
};