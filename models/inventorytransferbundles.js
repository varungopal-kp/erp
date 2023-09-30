'use strict';
module.exports = (sequelize, DataTypes) => {
	const InventoryTransferBundles = sequelize.define(
		'InventoryTransferBundles',
		{
			inventoryTransferId: DataTypes.INTEGER,
			oivlId: DataTypes.INTEGER,
			oivlBundleId: DataTypes.INTEGER,
			type: DataTypes.STRING
		},
		{}
	);
	InventoryTransferBundles.associate = function(models) {
		// associations can be defined here
		InventoryTransferBundles.belongsTo(models.InventoryTransfer, {
			foreignKey: 'inventoryTransferId'
		});
		InventoryTransferBundles.belongsTo(models.OIVL, {
			foreignKey: 'oivlId'
		});
		InventoryTransferBundles.belongsTo(models.OIVLBundleNumbers, {
			foreignKey: 'oivlBundleId'
		});
	};
	return InventoryTransferBundles;
};
