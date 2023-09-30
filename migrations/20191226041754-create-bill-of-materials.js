'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('BillOfMaterials', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      code: Sequelize.STRING,
      name: Sequelize.STRING,
      productId: Sequelize.INTEGER,
      description: Sequelize.STRING,
      averageProductionQuantity: Sequelize.DECIMAL(16, 4),
      uomId: Sequelize.INTEGER,
      remarks: Sequelize.STRING,
      productionUnitId: Sequelize.INTEGER,
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
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('BillOfMaterials');
  }
};