'use strict';
module.exports = (sequelize, DataTypes) => {
  const BOMRoutingStages = sequelize.define('BOMRoutingStages', {
    bomId: DataTypes.INTEGER,
    code: DataTypes.STRING,
    name: DataTypes.STRING,
  }, {});
  BOMRoutingStages.associate = function (models) {
    // associations can be defined here
    BOMRoutingStages.belongsTo(models.BillOfMaterials, {
      foreignKey: "bomId",
    })
  };
  return BOMRoutingStages;
};