'use strict';
module.exports = (sequelize, DataTypes) => {
	const ProductionPlanItems = sequelize.define(
		'ProductionPlanItems',
		{
			productionPlanId: DataTypes.INTEGER,
			itemMasterId: DataTypes.INTEGER,
			thickness: DataTypes.DECIMAL(16, 4),
			currentStock: DataTypes.DECIMAL(16, 4),
			orderQuantity: DataTypes.DECIMAL(16, 4),
			productionQuantityInPcs: DataTypes.DECIMAL(16, 4),
			productionQuantityInMT: DataTypes.DECIMAL(16, 4),
			semiFinishedItemId: DataTypes.INTEGER,
			semiFinishedItemStock: DataTypes.DECIMAL(16, 4),
			needToSlit: DataTypes.DECIMAL(16, 4),
			rawMaterialId: DataTypes.INTEGER,
			rawMaterialStock: DataTypes.DECIMAL(16, 4),
			routingStageId: DataTypes.INTEGER,
			endingDate: DataTypes.DATE,
			deletedAt: DataTypes.DATE
		},
		{ paranoid: true }
	);
	ProductionPlanItems.associate = function(models) {
		// associations can be defined here
		ProductionPlanItems.belongsTo(models.ProductionPlan, {
			foreignKey: 'productionPlanId',
			foreignKeyConstraint: true
		});

		ProductionPlanItems.belongsTo(models.ItemMaster, {
			foreignKey: 'itemMasterId',
			foreignKeyConstraint: true,
			as: 'FinishedItem'
		});

		ProductionPlanItems.belongsTo(models.ItemMaster, {
			foreignKey: 'semiFinishedItemId',
			foreignKeyConstraint: true,
			as: 'SemiFinishedItem'
		});

		ProductionPlanItems.belongsTo(models.ItemMaster, {
			foreignKey: 'rawMaterialId',
			foreignKeyConstraint: true,
			as: 'RawMaterial'
		});

		ProductionPlanItems.belongsTo(models.RoutingStages, {
			foreignKey: 'routingStageId',
			foreignKeyConstraint: true
		});
	};
	return ProductionPlanItems;
};
