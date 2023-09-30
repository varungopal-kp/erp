'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Warehouses', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      code: {
        type: Sequelize.STRING
      },
      name: {
        type: Sequelize.STRING
      },
      branchId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Branches",
          key: "id",
        },
        onDelete: "cascade",
        onUpdate: "cascade",
        allowNull: false,
      },
      virtualWarehouse: {
        type: Sequelize.BOOLEAN
      },
      statusId: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      isScrap: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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
    return queryInterface.dropTable('Warehouses');
  }
};