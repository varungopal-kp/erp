'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('TransactionNumbers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      objectCode: {
        type: Sequelize.STRING
      },
      series: {
        type: Sequelize.STRING
      },
      transactionTypeId: {
        type: Sequelize.INTEGER,
        references: {
          model: "TransactionTypes",
          key: "id",
        },
      },
      initialNumber: {
        type: Sequelize.INTEGER
      },
      nextNumber: {
        type: Sequelize.INTEGER
      },
      lastNumber: {
        type: Sequelize.INTEGER
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
    return queryInterface.dropTable('TransactionNumbers');
  }
};