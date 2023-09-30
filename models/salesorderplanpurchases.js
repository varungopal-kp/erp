'use strict';
module.exports = (sequelize, DataTypes) => {
  const SalesOrderPlanPurchases = sequelize.define('SalesOrderPlanPurchases', {
    salesOrderPlanId: DataTypes.INTEGER,
    salesOrderId: DataTypes.INTEGER,
    salesOrderItemId: DataTypes.INTEGER,
    itemMasterId: DataTypes.INTEGER,
    uomId: DataTypes.INTEGER,
    quantity: DataTypes.DECIMAL(16, 4),
  }, {});
  SalesOrderPlanPurchases.associate = function (models) {
    // associations can be defined here
    SalesOrderPlanPurchases.belongsTo(models.SalesOrderPlan, {
      foreignKey: "salesOrderPlanId",
    })
    SalesOrderPlanPurchases.belongsTo(models.SalesOrder, {
      foreignKey: "salesOrderId",
    })
    SalesOrderPlanPurchases.belongsTo(models.SalesOrderItem, {
      foreignKey: "salesOrderItemId",
    })
    SalesOrderPlanPurchases.belongsTo(models.ItemMaster, {
      foreignKey: "itemMasterId",
    })
    SalesOrderPlanPurchases.belongsTo(models.UOM, {
      foreignKey: "uomId",
    })
  };
  return SalesOrderPlanPurchases;
};