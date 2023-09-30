'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Branches', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      organizationId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Organizations",
          key: "id",
        },
        onDelete: "cascade",
        onUpdate: "cascade",
        allowNull: false,
      },
      address:{
        type: Sequelize.STRING
      },
      zipCode: {
        type: Sequelize.STRING
      },
      country: {
        type: Sequelize.STRING
      },
      website: {
        type: Sequelize.STRING
      },
      phone: {
        type: Sequelize.STRING
      },
      email: {
        type: Sequelize.STRING
      },
      fax: {
        type: Sequelize.STRING
      },
      printHeader: {
        type: Sequelize.STRING
      },
      registrationNo: {
        type: Sequelize.STRING
      },
      statusId: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
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
      },
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Branches');
  }
};