'use strict';
module.exports = (sequelize, DataTypes) => {
  const SalesDeliveryNoteBundles = sequelize.define('SalesDeliveryNoteBundles', {
    salesDeliveryNoteId: DataTypes.INTEGER,
    oivlId: DataTypes.INTEGER,
    oivlBundleId: DataTypes.INTEGER,
  }, {});
  SalesDeliveryNoteBundles.associate = function (models) {
    // associations can be defined here
    SalesDeliveryNoteBundles.belongsTo(models.SalesDeliveryNote, {
      foreignKey: "salesDeliveryNoteId",
    })
    SalesDeliveryNoteBundles.belongsTo(models.OIVL, {
      foreignKey: "oivlId",
    })
    SalesDeliveryNoteBundles.belongsTo(models.OIVLBundleNumbers, {
      foreignKey: "oivlBundleId",
    })
  };
  return SalesDeliveryNoteBundles;
};