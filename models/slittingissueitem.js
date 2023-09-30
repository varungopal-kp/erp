'use strict';
module.exports = (sequelize, DataTypes) => {
	const SlittingIssueItem = sequelize.define(
		'SlittingIssueItem',
		{
			slittingIssueId: DataTypes.INTEGER,
			productId: DataTypes.INTEGER,
			warehouseId: DataTypes.INTEGER,
			oivlId: DataTypes.INTEGER,
			issuedQuantity: DataTypes.DECIMAL(16, 4),
			uomId: DataTypes.INTEGER,
			coilWeight: DataTypes.DECIMAL(16, 4),
			plannedQuantity: DataTypes.DECIMAL(16, 4),
			price: DataTypes.DECIMAL(16, 4),
			total: DataTypes.DECIMAL(16, 4),
			deletedAt: DataTypes.DATE
		},
		{ paranoid: true }
	);
	SlittingIssueItem.associate = function(models) {
		// associations can be defined here
		SlittingIssueItem.belongsTo(models.SlittingIssue, {
			foreignKey: 'slittingIssueId'
		});
		SlittingIssueItem.belongsTo(models.ItemMaster, {
			foreignKey: 'productId'
		});
		SlittingIssueItem.belongsTo(models.UOM, {
			foreignKey: 'uomId'
		});
		SlittingIssueItem.belongsTo(models.Warehouse, {
			foreignKey: 'warehouseId'
		});
		SlittingIssueItem.belongsTo(models.OIVL, {
			foreignKey: 'oivlId'
		});
	};
	return SlittingIssueItem;
};
