'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('GoodsReceipts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      branchId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Branches",
          key: "id",
        },
      },
      docNum: {
        type: Sequelize.STRING
      },
      series: {
        type: Sequelize.STRING
      },
      refNum: {
        type: Sequelize.STRING
      },
      docDate: {
        type: Sequelize.DATE
      },
      total: {
        type: Sequelize.DECIMAL(16, 4)
      },
      remarks: {
        type: Sequelize.STRING
      },
      deleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      statusId: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      month: Sequelize.INTEGER,
      year: Sequelize.INTEGER,
      quarter: Sequelize.INTEGER,
      createdBy: {
        type: Sequelize.UUID,
        references: {
          model: "Users",
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
    return queryInterface.dropTable('GoodsReceipts');
  }
};