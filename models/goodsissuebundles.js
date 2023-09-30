"use strict"
module.exports = (sequelize, DataTypes) => {
  const GoodsIssueBundles = sequelize.define(
    "GoodsIssueBundles",
    {
      goodsIssueId: DataTypes.INTEGER,
      oivlId: DataTypes.INTEGER,
      oivlBundleId: DataTypes.INTEGER,
      numberOfPieces: DataTypes.INTEGER,
    },
    {}
  )
  GoodsIssueBundles.associate = function (models) {
    // associations can be defined here
    GoodsIssueBundles.belongsTo(models.GoodsIssue, {
      foreignKey: "goodsIssueId",
    })
    GoodsIssueBundles.belongsTo(models.OIVL, {
      foreignKey: "oivlId",
    })
    GoodsIssueBundles.belongsTo(models.OIVLBundleNumbers, {
      foreignKey: "oivlBundleId",
    })
  }
  return GoodsIssueBundles
}
