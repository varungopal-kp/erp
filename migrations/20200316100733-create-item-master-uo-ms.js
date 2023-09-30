"use strict";
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable("ItemMasterUOMs", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      uomId: {
        allowNull: false,
        type: Sequelize.INTEGER
      },
      itemMasterId: {
        allowNull: false,
        type: Sequelize.INTEGER
      },
      conversionFactor: {
        type: Sequelize.DECIMAL(16, 4)
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable("ItemMasterUOMs");
  }
};
