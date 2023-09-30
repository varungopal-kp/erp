'use strict';
module.exports = (sequelize, DataTypes) => {
  const UOM = sequelize.define('UOM', {
    code: DataTypes.STRING,
    name: DataTypes.STRING,
    transactionType: DataTypes.STRING,
    unitFormat: DataTypes.STRING,
    statusId: DataTypes.INTEGER,
    uomTypeId: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
  }, {});
  UOM.associate = function (models) {
    // associations can be defined here
    UOM.belongsTo(models.Status, {
      foreignKey: "statusId",
      as: "status",
    })
    UOM.belongsTo(models.UOMType, {
      foreignKey: "uomTypeId",
    })
  };
  return UOM;
};