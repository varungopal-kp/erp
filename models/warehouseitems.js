'use strict';
module.exports = (sequelize, DataTypes) => {
	const WarehouseItems = sequelize.define(
		'WarehouseItems',
		{
			itemMasterId: DataTypes.INTEGER,
			warehouseId: DataTypes.INTEGER,
			onHand: DataTypes.DECIMAL(16, 4),
			onOrder: DataTypes.DECIMAL(16, 4),
			commited: DataTypes.DECIMAL(16, 4),
			minStock: DataTypes.DECIMAL(16, 4),
			maxStock: DataTypes.DECIMAL(16, 4),
			minOrder: DataTypes.DECIMAL(16, 4),
			maxOrder: DataTypes.DECIMAL(16, 4),
			price: DataTypes.DECIMAL(16, 4),
			deletedAt: DataTypes.DATE,
			isDamage: DataTypes.BOOLEAN
		},
		{}
	);
	WarehouseItems.associate = function(models) {
		// associations can be defined here
		WarehouseItems.belongsTo(models.ItemMaster, {
			foreignKey: 'itemMasterId',
			as: 'ItemMaster'
		}),
			WarehouseItems.belongsTo(models.Warehouse, {
				foreignKey: 'warehouseId',
				as: 'Warehouse'
			});
	};
	return WarehouseItems;
};
