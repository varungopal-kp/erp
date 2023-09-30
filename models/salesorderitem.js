'use strict';
module.exports = (sequelize, DataTypes) => {
  const SalesOrderItem = sequelize.define('SalesOrderItem', {
    salesOrderId: DataTypes.INTEGER,
    itemMasterId: DataTypes.INTEGER,
    description: DataTypes.STRING,
    warehouseId: DataTypes.INTEGER,
    quantity: DataTypes.DECIMAL(16, 4),
    copiedQty: DataTypes.DECIMAL(16, 4),
    openQty: DataTypes.DECIMAL(16, 4),
    uomId: DataTypes.INTEGER,
    price: DataTypes.DECIMAL(16, 4),
    discountPerc: DataTypes.DECIMAL(16, 4),
    discount: DataTypes.DECIMAL(16, 4),
    priceAfterDiscount: DataTypes.DECIMAL(16, 4),
    taxPerc: DataTypes.DECIMAL(16, 4),
    tax: DataTypes.DECIMAL(16, 4),
    taxableValue: DataTypes.DECIMAL(16, 4),
    total: DataTypes.DECIMAL(16, 4),
    otherAmountPerc: DataTypes.DECIMAL(16, 4),
    otherAmount: DataTypes.DECIMAL(16, 4),
  }, {
    getterMethods: {
      name: function () {
        if (this.ItemMaster) {
          return this.ItemMaster.name;
        }
        return ""
      },
      managementTypeId: function () {
        if (this.ItemMaster) {
          return this.ItemMaster.managementTypeId;
        }
        return ""
      },
    }
  });
  SalesOrderItem.associate = function (models) {
    // associations can be defined here
    SalesOrderItem.belongsTo(models.SalesOrder, {
      foreignKey: "salesOrderId",
    })
    SalesOrderItem.belongsTo(models.ItemMaster, {
      foreignKey: "itemMasterId",
    })
    SalesOrderItem.belongsTo(models.Warehouse, {
      foreignKey: "warehouseId",
    })
    SalesOrderItem.belongsTo(models.UOM, {
      foreignKey: "uomId",
    })
  };
  return SalesOrderItem;
};