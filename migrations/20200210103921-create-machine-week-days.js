'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('MachineWeekDays', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      machineId: {
        type: Sequelize.INTEGER,
        references: {
          model: "MachineCenters",
          key: "id",
        },
      },
      weekDayId: {
        type: Sequelize.INTEGER,
        references: {
          model: "WeekDays",
          key: "id",
        },
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
    return queryInterface.dropTable('MachineWeekDays');
  }
};