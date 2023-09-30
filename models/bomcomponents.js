'use strict';
module.exports = (sequelize, DataTypes) => {
	const BOMComponents = sequelize.define(
		'BOMComponents',
		{
			bomId: DataTypes.INTEGER,
			productId: DataTypes.INTEGER,
			uomId: DataTypes.INTEGER,
			warehouseId: DataTypes.INTEGER,
			estimatedQuantity: DataTypes.DECIMAL(16, 4),
			quantityPerUnit: DataTypes.DECIMAL(16, 4),
			cost: DataTypes.DECIMAL(16, 4),
			remarks: DataTypes.STRING,
			quantityInBaseUnit: DataTypes.DECIMAL(16, 4),
			costInBaseUnit: DataTypes.DECIMAL(16, 4),
			deletedAt: DataTypes.DATE,
			totalCost: DataTypes.DECIMAL(16, 4),
			isDefault: DataTypes.BOOLEAN
		},
		{}
	);
	BOMComponents.associate = function(models) {
		// associations can be defined here
		BOMComponents.belongsTo(models.BillOfMaterials, {
			foreignKey: 'bomId'
		});
		BOMComponents.belongsTo(models.ItemMaster, {
			foreignKey: 'productId'
		});
		BOMComponents.belongsTo(models.Warehouse, {
			foreignKey: 'warehouseId'
		});
		BOMComponents.belongsTo(models.UOM, {
			foreignKey: 'uomId'
		});
	};
	return BOMComponents;
};
