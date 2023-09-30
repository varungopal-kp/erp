'use strict';
module.exports = (sequelize, DataTypes) => {
  const ProductionOrderLogs = sequelize.define('ProductionOrderLogs', {
    productionOrderId: DataTypes.INTEGER,
    message: DataTypes.STRING,
    createdUser: DataTypes.UUID,
  }, {});
  ProductionOrderLogs.associate = function (models) {
    // associations can be defined here
    ProductionOrderLogs.belongsTo(models.ProductionOrder, {
      foreignKey: "productionOrderId",
      foreignKeyConstraint: true,
    })

    ProductionOrderLogs.belongsTo(models.User, {
      foreignKey: "createdUser",
      foreignKeyConstraint: true,
    })
  };
  return ProductionOrderLogs;
};