'use strict';
module.exports = (sequelize, DataTypes) => {
  const ProductionOrderLabourDates = sequelize.define('ProductionOrderLabourDates', {
    productionOrderLabourId: DataTypes.INTEGER,
    productionOrderId: DataTypes.INTEGER,
    startDate: DataTypes.DATE,
    endDate: DataTypes.DATE,
    numberOfHours: DataTypes.DECIMAL(16, 4),
  }, {});
  ProductionOrderLabourDates.associate = function (models) {
    // associations can be defined here
    ProductionOrderLabourDates.belongsTo(models.ProductionOrder, {
      foreignKey: "productionOrderId",
    })
    ProductionOrderLabourDates.belongsTo(models.ProductionOrderLabours, {
      foreignKey: "productionOrderLabourId",
    })
  };
  return ProductionOrderLabourDates;
};