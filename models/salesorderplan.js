'use strict';
module.exports = (sequelize, DataTypes) => {
  const SalesOrderPlan = sequelize.define('SalesOrderPlan', {
    docNum: DataTypes.STRING,
    series: DataTypes.STRING,
    docDate: DataTypes.DATE,
    branchId: DataTypes.INTEGER,
    salesOrders: DataTypes.ARRAY(DataTypes.JSONB),
  }, {});
  SalesOrderPlan.associate = function (models) {
    // associations can be defined here
    SalesOrderPlan.hasMany(models.SalesOrderPlanProductions, {
      foreignKey: "salesOrderPlanId",
    })
    SalesOrderPlan.hasMany(models.SalesOrderPlanPurchases, {
      foreignKey: "salesOrderPlanId",
    })
  };
  return SalesOrderPlan;
};