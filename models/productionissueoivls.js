'use strict';
module.exports = (sequelize, DataTypes) => {
  const ProductionIssueOIVLs = sequelize.define('ProductionIssueOIVLs', {
    productionIssueId: DataTypes.INTEGER,
    oivlId: DataTypes.INTEGER,
    oivlBarcodeId: DataTypes.INTEGER,
    quantity: DataTypes.DECIMAL(16, 4),
    deletedAt: DataTypes.DATE,
  }, {
    timestamps: true,
    paranoid: true
  });
  ProductionIssueOIVLs.associate = function (models) {
    // associations can be defined here
    ProductionIssueOIVLs.belongsTo(models.ProductionIssue, {
      foreignKey: "productionIssueId",
    })
    ProductionIssueOIVLs.belongsTo(models.OIVL, {
      foreignKey: "oivlId",
    })
    ProductionIssueOIVLs.belongsTo(models.OIVLBarcodes, {
      foreignKey: "oivlBarcodeId",
    })
  };
  return ProductionIssueOIVLs;
};