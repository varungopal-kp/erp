'use strict';
module.exports = (sequelize, DataTypes) => {
  const GoodsIssueOIVL = sequelize.define('GoodsIssueOIVL', {
    goodsIssueId: DataTypes.INTEGER,
    oivlId: DataTypes.INTEGER,
    oivlBarcodeId: DataTypes.INTEGER,
    quantity: DataTypes.DECIMAL(16, 4),
    deletedAt: DataTypes.DATE,
  }, {
    timestamps: true,
    paranoid: true
  });
  GoodsIssueOIVL.associate = function (models) {
    // associations can be defined here
    GoodsIssueOIVL.belongsTo(models.GoodsIssue, {
      foreignKey: "goodsIssueId",
    })
    GoodsIssueOIVL.belongsTo(models.OIVL, {
      foreignKey: "oivlId",
    })
    GoodsIssueOIVL.belongsTo(models.OIVLBarcodes, {
      foreignKey: "oivlBarcodeId",
    })
  };
  return GoodsIssueOIVL;
};