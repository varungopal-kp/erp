'use strict';
module.exports = (sequelize, DataTypes) => {
	const InventoryTransferOIVL = sequelize.define(
		'InventoryTransferOIVL',
		{
			inventoryTransferId: DataTypes.INTEGER,
			oivlId: DataTypes.INTEGER,
			oivlBarcodeId: DataTypes.INTEGER,
			inQty: DataTypes.DECIMAL(16, 4),
			outQty: DataTypes.DECIMAL(16, 4),
			deletedAt: DataTypes.DATE
		},
		{
			timestamps: true,
			paranoid: true
		}
	);
	InventoryTransferOIVL.associate = function(models) {
		// associations can be defined here
		InventoryTransferOIVL.belongsTo(models.InventoryTransfer, {
			foreignKey: 'inventoryTransferId'
		});
		InventoryTransferOIVL.belongsTo(models.OIVL, {
			foreignKey: 'oivlId'
		});
		InventoryTransferOIVL.belongsTo(models.OIVLBarcodes, {
			foreignKey: 'oivlBarcodeId'
		});
	};
	return InventoryTransferOIVL;
};
