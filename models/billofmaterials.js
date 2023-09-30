'use strict';
module.exports = (sequelize, DataTypes) => {
	const BillOfMaterial = sequelize.define(
		'BillOfMaterials',
		{
			code: DataTypes.STRING,
			name: DataTypes.STRING,
			productId: {
				type: DataTypes.INTEGER,
				unique: true
			},
			description: DataTypes.STRING,
			averageProductionQuantity: DataTypes.DECIMAL(16, 4),
			uomId: DataTypes.INTEGER,
			productionUnitId: DataTypes.INTEGER,
			remarks: DataTypes.STRING,
			deleted: DataTypes.BOOLEAN,
			deletedAt: DataTypes.DATE,
			totalCost: DataTypes.DECIMAL(16, 4),
			totalCostInBaseUnit: DataTypes.DECIMAL(16, 4)
		},
		{}
	);
	BillOfMaterial.associate = function(models) {
		// associations can be defined here
		BillOfMaterial.belongsTo(models.ItemMaster, {
			foreignKey: 'productId'
		});
		BillOfMaterial.hasMany(models.BOMComponents, {
			foreignKey: 'bomId'
		});
		BillOfMaterial.belongsTo(models.ProductionUnit, {
			foreignKey: 'productionUnitId'
		});
		BillOfMaterial.hasMany(models.BOMLabours, {
			foreignKey: 'bomId'
		});
		BillOfMaterial.hasMany(models.BOMMachines, {
			foreignKey: 'bomId'
		});
		BillOfMaterial.hasMany(models.BOMRoutingStages, {
			foreignKey: 'bomId'
		});
		BillOfMaterial.belongsTo(models.UOM, {
			foreignKey: 'uomId'
		});
	};
	return BillOfMaterial;
};
