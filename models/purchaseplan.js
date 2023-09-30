'use strict';
module.exports = (sequelize, DataTypes) => {
  const PurchasePlan = sequelize.define('PurchasePlan', {
    salesOrderId: DataTypes.INTEGER,
    salesOrderItemId: DataTypes.INTEGER,
    itemMasterId: DataTypes.INTEGER,
    quantity: DataTypes.DECIMAL(16, 4),
    uomId: DataTypes.INTEGER,
    salesOrderPlanId: DataTypes.INTEGER,
  }, {});
  PurchasePlan.associate = function (models) {
    // associations can be defined here
    PurchasePlan.belongsTo(models.SalesOrder, {
      foreignKey: "salesOrderId",
      foreignKeyConstraint: true
    })
    PurchasePlan.belongsTo(models.SalesOrderItem, {
      foreignKey: "salesOrderItemId",
      foreignKeyConstraint: true
    })
    PurchasePlan.belongsTo(models.ItemMaster, {
      foreignKey: "itemMasterId",
      foreignKeyConstraint: true
    })
    PurchasePlan.belongsTo(models.UOM, {
      foreignKey: "uomId",
      foreignKeyConstraint: true
    })
  };
  return PurchasePlan;
};