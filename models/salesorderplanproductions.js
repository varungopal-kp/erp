'use strict';
module.exports = (sequelize, DataTypes) => {
  const SalesOrderPlanProductions = sequelize.define('SalesOrderPlanProductions', {
    salesOrderPlanId: DataTypes.INTEGER,
    itemMasterId: DataTypes.INTEGER,
    warehouseId: DataTypes.INTEGER,
    requiredQty: DataTypes.DECIMAL(16, 4),
    availableQty: DataTypes.DECIMAL(16, 4),
    productionQty: DataTypes.DECIMAL(16, 4),
    dueDate: DataTypes.DATE,
  }, {});
  SalesOrderPlanProductions.associate = function (models) {
    // associations can be defined here
    SalesOrderPlanProductions.belongsTo(models.SalesOrderPlan, {
      foreignKey: "salesOrderPlanId",
    })
    SalesOrderPlanProductions.belongsTo(models.ItemMaster, {
      foreignKey: "itemMasterId",
    })
    SalesOrderPlanProductions.belongsTo(models.Warehouse, {
      foreignKey: "warehouseId",
    })
  };
  return SalesOrderPlanProductions;
};