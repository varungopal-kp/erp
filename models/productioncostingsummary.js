'use strict';
module.exports = (sequelize, DataTypes) => {
  const ProductionCostingSummary = sequelize.define('ProductionCostingSummary', {
    productionOrderId: DataTypes.INTEGER,
    plannedQuantity: DataTypes.DECIMAL(16, 4),
    plannedUOMId: DataTypes.INTEGER,
    plannedUnitCost: DataTypes.DECIMAL(16, 4),
    plannedTotalCost: DataTypes.DECIMAL(16, 4),
    plannedComponentCost: DataTypes.DECIMAL(16, 4),
    plannedMachineCost: DataTypes.DECIMAL(16, 4),
    actualQuantity: DataTypes.DECIMAL(16, 4),
    actualUnitCost: DataTypes.DECIMAL(16, 4),
    actualTotalCost: DataTypes.DECIMAL(16, 4),
    actualMachineCost: DataTypes.DECIMAL(16, 4),
    plannedLabourCost: DataTypes.DECIMAL(16, 4),
    actualTotalLabourCost: DataTypes.DECIMAL(16, 4),
    actualComponentCost: DataTypes.DECIMAL(16, 4),

  }, {});
  ProductionCostingSummary.associate = function (models) {
    // associations can be defined here
    ProductionCostingSummary.belongsTo(models.ProductionOrder, {
      foreignKey: "productionOrderId",
      foreignKeyConstraint: true
    })
    ProductionCostingSummary.belongsTo(models.UOM, {
      foreignKey: "plannedUOMId",
      foreignKeyConstraint: true
    })
  };
  return ProductionCostingSummary;
};