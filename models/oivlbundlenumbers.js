"use strict"
module.exports = (sequelize, DataTypes) => {
  const OIVLBundleNumbers = sequelize.define(
    "OIVLBundleNumbers",
    {
      productionOrderId: DataTypes.INTEGER,
      productionReceiptId: DataTypes.INTEGER,
      productionReceiptItemId: DataTypes.INTEGER,
      inventoryTransferId: DataTypes.INTEGER,
      productionOrderBundleNumberId: DataTypes.INTEGER,
      bundleNumber: {
        type: DataTypes.STRING,
        unique: true,
      },
      oivlId: DataTypes.INTEGER,
      numberOfPieces: DataTypes.DECIMAL(16, 4),
      quantityInBaseUnit: DataTypes.DECIMAL(16, 4),
      available: DataTypes.BOOLEAN,
      goodsReceiptId: DataTypes.INTEGER,
    },
    {
      getterMethods: {
        // bundleNumber: function() {
        // 	if (this.PORBundleNos) {
        // 		return this.PORBundleNos.bundleNumber;
        // 	}
        // 	return '';
        // }
      },
    }
  )
  OIVLBundleNumbers.associate = function (models) {
    // associations can be defined here
    OIVLBundleNumbers.belongsTo(models.OIVL, {
      foreignKey: "oivlId",
    })
    OIVLBundleNumbers.belongsTo(models.ProductionOrder, {
      foreignKey: "productionOrderId",
    })
    OIVLBundleNumbers.belongsTo(models.ProductionReceipt, {
      foreignKey: "productionReceiptId",
    })
    OIVLBundleNumbers.belongsTo(models.ProductionReceiptItems, {
      foreignKey: "productionReceiptItemId",
    })
    OIVLBundleNumbers.belongsTo(models.InventoryTransfer, {
      foreignKey: "inventoryTransferId",
    })
    OIVLBundleNumbers.belongsTo(models.ProductionOrderBundleNumbers, {
      foreignKey: "productionOrderBundleNumberId",
      as: "PORBundleNos",
    })
  }
  return OIVLBundleNumbers
}
