"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("UserPrivileges", "delete", {
      type: Sequelize.BOOLEAN,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("UserPrivileges", "delete");
  },
};
