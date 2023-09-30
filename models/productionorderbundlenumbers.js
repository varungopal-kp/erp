'use strict';
module.exports = (sequelize, DataTypes) => {
  const ProductionOrderBundleNumbers = sequelize.define('ProductionOrderBundleNumbers', {
    productionOrderId: DataTypes.INTEGER,
    bundleNumber: DataTypes.STRING,
    available: DataTypes.BOOLEAN,
    quantityInBaseUnit: DataTypes.DECIMAL(16, 4),
    productionReceiptId: DataTypes.INTEGER,
    docDate: DataTypes.DATE,
  }, {});
  ProductionOrderBundleNumbers.associate = function (models) {
    // associations can be defined here
    ProductionOrderBundleNumbers.belongsTo(models.ProductionOrder, {
      foreignKey: "productionOrderId",
      foreignKeyConstraint: true,
    })

    ProductionOrderBundleNumbers.belongsTo(models.ProductionReceipt, {
      foreignKey: "productionReceiptId",
      foreignKeyConstraint: true,
    })
  };
  return ProductionOrderBundleNumbers;
};