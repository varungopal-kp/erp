'use strict';
module.exports = (sequelize, DataTypes) => {
	const SlittingPlanItemDetails = sequelize.define(
		'SlittingPlanItemDetails',
		{
			slittingPlanId: DataTypes.INTEGER,
			slittingPlanItemId: DataTypes.INTEGER,
			itemMasterId: DataTypes.INTEGER,
			deletedAt: DataTypes.DATE
		},
		{
			paranoid: true
		}
	);
	SlittingPlanItemDetails.associate = function(models) {
		// associations can be defined here
		SlittingPlanItemDetails.belongsTo(models.SlittingPlan, {
			foreignKey: 'slittingPlanId',
			foreignKeyConstraint: true
		});

		SlittingPlanItemDetails.belongsTo(models.ItemMaster, {
			foreignKey: 'itemMasterId',
			foreignKeyConstraint: true
		});

		SlittingPlanItemDetails.belongsTo(models.SlittingPlanItems, {
			foreignKey: 'slittingPlanItemId',
			foreignKeyConstraint: true
		});
	};
	return SlittingPlanItemDetails;
};
