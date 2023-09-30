"use strict"
module.exports = (sequelize, DataTypes) => {
  const GoodsReceiptItem = sequelize.define(
    "GoodsReceiptItem",
    {
      goodsReceiptId: DataTypes.INTEGER,
      itemMasterId: DataTypes.INTEGER,
      description: DataTypes.STRING,
      quantity: DataTypes.DECIMAL(16, 4),
      uomId: DataTypes.INTEGER,
      unitPrice: DataTypes.DECIMAL(16, 4),
      total: DataTypes.DECIMAL(16, 4),
      warehouseId: DataTypes.INTEGER,
      deletedAt: DataTypes.DATE,
      managementTypeId: DataTypes.INTEGER,
      noOfBundles: DataTypes.DECIMAL(16, 4),
      piecesPerBundle: DataTypes.DECIMAL(16, 4),
      loosePieces: DataTypes.DECIMAL(16, 4),
    },
    {}
  )
  GoodsReceiptItem.associate = function (models) {
    // associations can be defined here
    GoodsReceiptItem.belongsTo(models.GoodsReceipt, {
      foreignKey: "goodsReceiptId",
      as: "GoodsReceipt",
    }),
      GoodsReceiptItem.belongsTo(models.ItemMaster, {
        foreignKey: "itemMasterId",
        as: "ItemMaster",
      }),
      GoodsReceiptItem.belongsTo(models.UOM, {
        foreignKey: "uomId",
        as: "UOM",
      }),
      GoodsReceiptItem.belongsTo(models.Warehouse, {
        foreignKey: "warehouseId",
        as: "Warehouse",
      })
  }
  return GoodsReceiptItem
}
