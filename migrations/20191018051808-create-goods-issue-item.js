'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('GoodsIssueItems', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      goodsIssueId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      itemMasterId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "ItemMasters",
          key: "id",
        },
      },
      description: {
        type: Sequelize.STRING
      },
      quantity: {
        type: Sequelize.STRING,
      },
      uomId: {
        type: Sequelize.INTEGER,
        references: {
          model: "UOMs",
          key: "id",
        },
      },
      unitPrice: {
        type: Sequelize.DECIMAL(16, 4)
      },
      total: {
        type: Sequelize.DECIMAL(16, 4)
      },
      warehouseId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Warehouses",
          key: "id",
        },
      },
      managementTypeId: Sequelize.INTEGER,
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
    return queryInterface.dropTable('GoodsIssueItems');
  }
};