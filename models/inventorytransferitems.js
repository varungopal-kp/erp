'use strict';
module.exports = (sequelize, DataTypes) => {
	const InventoryTransferItems = sequelize.define(
		'InventoryTransferItems',
		{
			inventoryTransferId: DataTypes.INTEGER,
			itemMasterId: DataTypes.INTEGER,
			quantity: DataTypes.DECIMAL(16, 4),
			uomId: DataTypes.INTEGER,
			unitPrice: DataTypes.DECIMAL(16, 4),
			OIVLs: DataTypes.ARRAY(DataTypes.JSONB),
			description: DataTypes.STRING,
			deletedAt: DataTypes.DATE
		},
		{}
	);
	InventoryTransferItems.associate = function(models) {
		// associations can be defined here
		// InventoryTransferItems.belongsTo(models.InventoryTransfers, {
		//   foreignKey: "inventoryTransferId",
		//   as: "InventoryTransfers",
		// }),
		InventoryTransferItems.belongsTo(models.ItemMaster, {
			foreignKey: 'itemMasterId',
			as: 'ItemMaster'
		});
	};
	return InventoryTransferItems;
};
