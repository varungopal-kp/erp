'use strict';
module.exports = (sequelize, DataTypes) => {
  const SalesDeliveryNoteOIVLs = sequelize.define('SalesDeliveryNoteOIVLs', {
    salesDeliveryNoteId: DataTypes.INTEGER,
    oivlId: DataTypes.INTEGER,
    oivlBarcodeId: DataTypes.INTEGER,
    quantity: DataTypes.DECIMAL(16, 4),
    deletedAt: DataTypes.DATE,
  }, {
    timestamps: true,
    paranoid: true
  });
  SalesDeliveryNoteOIVLs.associate = function (models) {
    // associations can be defined here
    SalesDeliveryNoteOIVLs.belongsTo(models.SalesDeliveryNote, {
      foreignKey: "salesDeliveryNoteId",
    })
    SalesDeliveryNoteOIVLs.belongsTo(models.OIVL, {
      foreignKey: "oivlId",
    })
    SalesDeliveryNoteOIVLs.belongsTo(models.OIVLBarcodes, {
      foreignKey: "oivlBarcodeId",
    })
  };
  return SalesDeliveryNoteOIVLs;
};