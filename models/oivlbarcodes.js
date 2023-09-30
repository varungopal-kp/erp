'use strict';
module.exports = (sequelize, DataTypes) => {
  const OIVLBarcode = sequelize.define('OIVLBarcodes', {
    barcode: DataTypes.STRING,
    oivlId: DataTypes.INTEGER,
    itemMasterId: DataTypes.INTEGER,
    warehouseId: DataTypes.INTEGER,
    available: DataTypes.BOOLEAN,
    deletedAt: DataTypes.DATE,
  }, {

  });
  OIVLBarcode.associate = function (models) {
    // associations can be defined here
    OIVLBarcode.belongsTo(models.OIVL, {
        foreignKey: "oivlId",
      }),
      OIVLBarcode.belongsTo(models.ItemMaster, {
        foreignKey: "itemMasterId",
      }),
      OIVLBarcode.belongsTo(models.Warehouse, {
        foreignKey: "warehouseId",
      })
  };
  return OIVLBarcode;
};