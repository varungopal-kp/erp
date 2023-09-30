'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('UserPrivileges', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      moduleId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Modules",
          key: "id",
        },
      },
      userId: {
        type: Sequelize.UUID,
        references: {
          model: "Users",
          key: "id",
        },
      },
      read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      write: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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
      },
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('UserPrivileges');
  }
};