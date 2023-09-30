'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return await queryInterface.bulkInsert('TransactionTypes', [{
      code: 'INT',
      name: 'INT',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      code: 'GRT',
      name: 'GRT',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      code: 'GIS',
      name: 'GIS',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ], {});
  },

  down: async (queryInterface, Sequelize) => {
    return await queryInterface.bulkDelete('TransactionTypes', null, {});
  }
};
