"use strict"
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable("GoodsIssueBundles", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      goodsIssueId: {
        type: Sequelize.INTEGER,
        references: {
          model: "GoodsIssues",
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
      numberOfPieces: Sequelize.INTEGER,
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
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable("GoodsIssueBundles")
  },
}
