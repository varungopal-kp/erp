'use strict';
module.exports = (sequelize, DataTypes) => {
	const SlittingReceiptItem = sequelize.define(
		'SlittingReceiptItem',
		{
			slittingReceiptId: DataTypes.INTEGER,
			productId: DataTypes.INTEGER,
			warehouseId: DataTypes.INTEGER,
			quantity: DataTypes.DECIMAL(16, 4),
			uomId: DataTypes.INTEGER,
			plannedQuantity: DataTypes.DECIMAL(16, 4),
			price: DataTypes.DECIMAL(16, 4),
			total: DataTypes.DECIMAL(16, 4),
			deletedAt: DataTypes.DATE
		},
		{ paranoid: true }
	);
	SlittingReceiptItem.associate = function(models) {
		// associations can be defined here
		SlittingReceiptItem.belongsTo(models.SlittingReceipt, {
			foreignKey: 'slittingReceiptId'
		});
		SlittingReceiptItem.belongsTo(models.ItemMaster, {
			foreignKey: 'productId'
		});
		SlittingReceiptItem.belongsTo(models.UOM, {
			foreignKey: 'uomId'
		});
		SlittingReceiptItem.belongsTo(models.Warehouse, {
			foreignKey: 'warehouseId'
		});
	};
	return SlittingReceiptItem;
};
