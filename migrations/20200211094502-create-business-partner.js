'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('BusinessPartners', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      code: Sequelize.STRING,
      name: Sequelize.STRING,
      type: Sequelize.STRING,
      billingAddress: Sequelize.JSONB,
      shippingAddress: Sequelize.JSONB,
      bankCode: Sequelize.STRING,
      bankName: Sequelize.STRING,
      bankSwiftCode: Sequelize.STRING,
      bankCountryId: Sequelize.INTEGER,
      bankCreditLimit: Sequelize.DECIMAL(16, 4),
      attachments: Sequelize.JSONB,
      glAccountId: Sequelize.INTEGER,
      currencyId: Sequelize.INTEGER,
      remarks: Sequelize.STRING,
      deleted: {
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
    return queryInterface.dropTable('BusinessPartners');
  }
};