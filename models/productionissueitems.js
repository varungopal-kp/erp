'use strict';
module.exports = (sequelize, DataTypes) => {
  const ProductionIssueItems = sequelize.define('ProductionIssueItems', {
    productionIssueId: DataTypes.INTEGER,
    productId: DataTypes.INTEGER,
    description: DataTypes.STRING,
    warehouseId: DataTypes.INTEGER,
    issuedQuantity: DataTypes.DECIMAL(16, 4),
    uomId: DataTypes.INTEGER,
    plannedQuantity: DataTypes.DECIMAL(16, 4),
    deletedAt: DataTypes.DATE,
    managementTypeId: DataTypes.INTEGER,
    price: DataTypes.DECIMAL(16, 4),
    total: DataTypes.DECIMAL(16, 4),
  }, {});
  ProductionIssueItems.associate = function (models) {
    // associations can be defined here
    ProductionIssueItems.belongsTo(models.ProductionIssue, {
      foreignKey: "productionIssueId",
    })
    ProductionIssueItems.belongsTo(models.ItemMaster, {
      foreignKey: "productId",
    })
    ProductionIssueItems.belongsTo(models.UOM, {
      foreignKey: "uomId",
    })
    ProductionIssueItems.belongsTo(models.Warehouse, {
      foreignKey: "warehouseId",
    })
  };
  return ProductionIssueItems;
};