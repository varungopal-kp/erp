'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return await queryInterface.bulkInsert('Statuses', [{
        name: 'Active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Inactive',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    return await queryInterface.bulkDelete('Statuses', null, {});
  }
};