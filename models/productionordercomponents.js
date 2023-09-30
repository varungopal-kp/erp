'use strict';
module.exports = (sequelize, DataTypes) => {
  const ProductionOrderComponents = sequelize.define('ProductionOrderComponents', {
    productionOrderId: DataTypes.INTEGER,
    productId: DataTypes.INTEGER,
    warehouseId: DataTypes.INTEGER,
    quantityPerUnit: DataTypes.DECIMAL(16, 4),
    totalQuantity: DataTypes.DECIMAL(16, 4),
    uomId: DataTypes.INTEGER,
    unitCost: DataTypes.DECIMAL(16, 4),
    totalCost: DataTypes.DECIMAL(16, 4),
    remarks: DataTypes.STRING,
    deletedAt: DataTypes.DATE,
    quantityInBaseUnit: DataTypes.DECIMAL(16, 4),
    costInBaseUnit: DataTypes.DECIMAL(16, 4),
    issuedQuantity: DataTypes.DECIMAL(16, 4),
  }, {
    getterMethods: {
      pendingQuantity: function () {
        let pendingQuantity = +this.getDataValue('totalQuantity') - +this.getDataValue('issuedQuantity')
        if (pendingQuantity) {
          return pendingQuantity
        }
        return ""
      },
    },
  });
  ProductionOrderComponents.associate = function (models) {
    // associations can be defined here
    ProductionOrderComponents.belongsTo(models.ProductionOrder, {
      foreignKey: "productionOrderId",
      foreignKeyConstraint: true,
    })
    ProductionOrderComponents.belongsTo(models.ItemMaster, {
      foreignKey: "productId",
      foreignKeyConstraint: true,
    })
    ProductionOrderComponents.belongsTo(models.UOM, {
      foreignKey: "uomId",
      foreignKeyConstraint: true,
    })
  };
  return ProductionOrderComponents;
};