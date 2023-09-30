'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('ItemMasterAttributes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      itemMasterId: {
        type: Sequelize.INTEGER,
        references: {
          model: "ItemMasters",
          key: "id",
        },
        onDelete: "cascade",
        onUpdate: "cascade",
      },
      itemAttributeId: {
        type: Sequelize.INTEGER,
        references: {
          model: "ItemAttributes",
          key: "id",
        },
        onDelete: "cascade",
        onUpdate: "cascade",
      },
      value: {
        type: Sequelize.STRING,
      },
      uomId: {
        type: Sequelize.INTEGER,
        references: {
          model: "UOMs",
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
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('ItemMasterAttributes');
  }
};