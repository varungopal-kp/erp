'use strict';
module.exports = (sequelize, DataTypes) => {
	const SlittingOrderItem = sequelize.define(
		'SlittingOrderItem',
		{
			slittingOrderId: DataTypes.INTEGER,
			itemMasterId: DataTypes.INTEGER,
			quantity: DataTypes.DECIMAL,
			uomId: DataTypes.INTEGER,
			weightPerPiece: DataTypes.DECIMAL,
			price: DataTypes.DECIMAL,
			total: DataTypes.DECIMAL,
			remarks: DataTypes.STRING
		},
		{}
	);
	SlittingOrderItem.associate = function(models) {
		// associations can be defined here
		SlittingOrderItem.belongsTo(models.SlittingOrder, {
			foreignKey: 'slittingOrderId',
			foreignKeyConstraint: true
		});

		SlittingOrderItem.belongsTo(models.ItemMaster, {
			foreignKey: 'itemMasterId',
			foreignKeyConstraint: true
		});

		SlittingOrderItem.belongsTo(models.UOM, {
			foreignKey: 'uomId',
			foreignKeyConstraint: true
		});
	};
	return SlittingOrderItem;
};
