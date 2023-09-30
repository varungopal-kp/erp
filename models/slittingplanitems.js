'use strict';
module.exports = (sequelize, DataTypes) => {
	const SlittingPlanItems = sequelize.define(
		'SlittingPlanItems',
		{
			slittingPlanId: DataTypes.INTEGER,
			itemMasterId: DataTypes.INTEGER,
			oivlId: DataTypes.INTEGER,
			width: DataTypes.DECIMAL(16, 4),
			thickness: DataTypes.DECIMAL(16, 4),
			coilWeight: DataTypes.DECIMAL(16, 4),
			widthConsumed: DataTypes.DECIMAL(16, 4),
			scrapWeight: DataTypes.DECIMAL(16, 4),
			deletedAt: DataTypes.DATE
		},
		{
			paranoid: true
		}
	);
	SlittingPlanItems.associate = function(models) {
		// associations can be defined here
		SlittingPlanItems.belongsTo(models.SlittingPlan, {
			foreignKey: 'slittingPlanId',
			foreignKeyConstraint: true
		});

		SlittingPlanItems.belongsTo(models.ItemMaster, {
			foreignKey: 'itemMasterId',
			foreignKeyConstraint: true
		});

		SlittingPlanItems.belongsTo(models.OIVL, {
			foreignKey: 'oivlId',
			foreignKeyConstraint: true
		});

		SlittingPlanItems.hasMany(models.SlittingPlanItemDetails, {
			foreignKey: 'slittingPlanItemId'
		});
	};
	return SlittingPlanItems;
};
