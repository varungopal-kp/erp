'use strict';
module.exports = (sequelize, DataTypes) => {
  const Warehouse = sequelize.define('Warehouse', {
    code: DataTypes.STRING,
    name: DataTypes.STRING,
    branchId: DataTypes.INTEGER,
    virtualWarehouse: DataTypes.BOOLEAN,
    statusId: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
    isScrap: DataTypes.BOOLEAN,
    image: DataTypes.STRING,
  }, {});
  Warehouse.associate = function (models) {
    // associations can be defined here
    Warehouse.belongsTo(models.Branch, {
        foreignKey: "branchId",
        as: "Branch",
      }),
      Warehouse.hasMany(models.WarehouseItems, {
        foreignKey: "warehouseId",
        as: "WarehouseItems",
      }),
      Warehouse.belongsTo(models.Status, {
        foreignKey: "statusId",
        as: "status",
      })
  };
  return Warehouse;
};