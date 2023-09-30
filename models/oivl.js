'use strict';
module.exports = (sequelize, DataTypes) => {
	const OIVL = sequelize.define(
		'OIVL',
		{
			docNum: DataTypes.STRING,
			docType: DataTypes.STRING,
			documentId: DataTypes.INTEGER,
			branchId: DataTypes.INTEGER,
			itemMasterId: DataTypes.INTEGER,
			warehouseId: DataTypes.INTEGER,
			inQty: DataTypes.DECIMAL(16, 4),
			outQty: DataTypes.DECIMAL(16, 4),
			openQty: DataTypes.DECIMAL(16, 4),
			price: DataTypes.DECIMAL(16, 4),
			cost: DataTypes.DECIMAL(16, 4),
			currencyId: DataTypes.INTEGER,
			deleted: DataTypes.BOOLEAN,
			deletedAt: DataTypes.DATE,
			barcode: DataTypes.STRING,
			remarks: DataTypes.STRING,
			docDate: DataTypes.DATE
		},
		{
			paranoid: true
		}
	);
	OIVL.associate = function(models) {
		// associations can be defined here
		OIVL.belongsTo(models.ItemMaster, {
			foreignKey: 'itemMasterId',
			as: 'ItemMaster'
		});
		OIVL.belongsTo(models.Warehouse, {
			foreignKey: 'warehouseId',
			as: 'Warehouse'
		});
		OIVL.hasMany(models.OIVLBundleNumbers, {
			foreignKey: 'oivlId',
			foreignKeyConstraint: true
		});
	};
	return OIVL;
};
