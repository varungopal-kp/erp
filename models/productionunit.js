"use strict";
module.exports = (sequelize, DataTypes) => {
  const ProductionUnit = sequelize.define(
    "ProductionUnit", {
      code: DataTypes.STRING,
      name: DataTypes.STRING,
      branchId: DataTypes.INTEGER,
      scrapWarehouseId: DataTypes.INTEGER,
      deletedAt: DataTypes.DATE,
    }, {}
  );
  ProductionUnit.associate = function (models) {
    // associations can be defined here
    ProductionUnit.belongsTo(models.Branch, {
      foreignKey: "branchId"
    });
    ProductionUnit.belongsTo(models.Warehouse, {
      foreignKey: "scrapWarehouseId"
    });
  };
  return ProductionUnit;
};