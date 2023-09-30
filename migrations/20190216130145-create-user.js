const uuid = require('uuid');

"use strict"
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable("Users", {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        // defaultValue: uuid()
      },
      email: {
        type: Sequelize.STRING,
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },     
      isLocked: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      branchId: {
        type: Sequelize.INTEGER,
        // references: {
        //   model: "Branch",
        //   key: "id",
        // },
        // onDelete: "cascade",
        // onUpdate: "cascade",
        allowNull: false,
      },
      employeeId: {
        type: Sequelize.INTEGER,
        // references: {
        //   model: "Employees",
        //   key: "id",
        // },
        // onDelete: "cascade",
        // onUpdate: "cascade",
      },
      statusId: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      isSuperAdmin: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        onUpdate: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable("Users")
  },
}
