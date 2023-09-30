'use strict';
module.exports = (sequelize, DataTypes) => {
  const GoodsIssueItem = sequelize.define('GoodsIssueItem', {
    goodsIssueId: DataTypes.INTEGER,
    itemMasterId: DataTypes.INTEGER,
    description: DataTypes.STRING,
    quantity: DataTypes.DECIMAL(16, 4),
    uomId: DataTypes.INTEGER,
    unitPrice: DataTypes.DECIMAL(16, 4),
    total: DataTypes.DECIMAL(16, 4),
    warehouseId: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
    managementTypeId: DataTypes.INTEGER,
  }, {});
  GoodsIssueItem.associate = function (models) {
    // associations can be defined here
    GoodsIssueItem.belongsTo(models.GoodsIssue, {
        foreignKey: "goodsIssueId",
        as: "GoodsIssue",
      }),
      GoodsIssueItem.belongsTo(models.ItemMaster, {
        foreignKey: "itemMasterId",
        as: "ItemMaster",
      }),
      GoodsIssueItem.belongsTo(models.UOM, {
        foreignKey: "uomId",
        as: "UOM",
      }),
      GoodsIssueItem.belongsTo(models.Warehouse, {
        foreignKey: "warehouseId",
        as: "Warehouse",
      })
  };
  return GoodsIssueItem;
};