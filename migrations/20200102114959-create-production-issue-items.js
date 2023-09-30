'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('ProductionIssueItems', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      productionIssueId: {
        type: Sequelize.INTEGER,
        references: {
          model: "ProductionIssues",
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
      issuedQuantity: Sequelize.DECIMAL(16, 4),
      uomId: {
        type: Sequelize.INTEGER,
        references: {
          model: "UOMs",
          key: "id",
        },
      },
      plannedQuantity: Sequelize.DECIMAL(16, 4),
      managementTypeId: Sequelize.INTEGER,
      price: Sequelize.DECIMAL(16, 4),
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
      deletedAt: {
        type: Sequelize.DATE,
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('ProductionIssueItems');
  }
};