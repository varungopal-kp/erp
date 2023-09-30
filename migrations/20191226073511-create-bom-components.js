'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('BOMComponents', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      bomId: {
        type: Sequelize.INTEGER,
        references: {
          model: "BillOfMaterials",
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
      warehouseId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Warehouses",
          key: "id",
        },
      },
      uomId: {
        type: Sequelize.INTEGER,
        references: {
          model: "UOMs",
          key: "id",
        },
      },
      estimatedQuantity: Sequelize.DECIMAL(16, 4),
      quantityPerUnit: Sequelize.DECIMAL(16, 4),
      quantityInBaseUnit: Sequelize.DECIMAL(16, 4),
      cost: Sequelize.DECIMAL(16, 4),
      remarks: Sequelize.STRING,
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
    return queryInterface.dropTable('BOMComponents');
  }
};