'use strict';
module.exports = (sequelize, DataTypes) => {
  const ProductionOrderMachineDates = sequelize.define('ProductionOrderMachineDates', {
    productionOrderMachineId: DataTypes.INTEGER,
    productionOrderId: DataTypes.INTEGER,
    startDate: DataTypes.DATE,
    endDate: DataTypes.DATE,
    numberOfHours: DataTypes.DECIMAL(16, 4),
  }, {});
  ProductionOrderMachineDates.associate = function (models) {
    // associations can be defined here
    ProductionOrderMachineDates.belongsTo(models.ProductionOrder, {
      foreignKey: "productionOrderId",
    })
    ProductionOrderMachineDates.belongsTo(models.ProductionOrderMachines, {
      foreignKey: "productionOrderMachineId",
    })
  };
  return ProductionOrderMachineDates;
};