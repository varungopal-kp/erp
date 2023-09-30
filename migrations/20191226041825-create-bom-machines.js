"use strict";
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable("BOMMachines", {
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
          key: "id"
        }
      },
      machineId: {
        type: Sequelize.INTEGER,
        references: {
          model: "MachineCenters",
          key: "id"
        }
      },
      estimatedTime: Sequelize.DECIMAL(16, 4),
      hoursInBaseUnit: Sequelize.DECIMAL(16, 1),
      cost: Sequelize.DECIMAL(16, 4),
      remarks: Sequelize.STRING,
      routingStageNumber: Sequelize.STRING,
      noOfLabours: DataTypes.INTEGER,
      routingStageId: {
        type: Sequelize.INTEGER,
        references: {
          model: "RoutingStages",
          key: "id"
        }
      },
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
    return queryInterface.dropTable("BOMMachines");
  }
};