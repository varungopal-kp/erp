'use strict';
module.exports = (sequelize, DataTypes) => {
	const ProductionReceiptItems = sequelize.define(
		'ProductionReceiptItems',
		{
			productionReceiptId: DataTypes.INTEGER,
			productId: DataTypes.INTEGER,
			description: DataTypes.STRING,
			warehouseId: DataTypes.INTEGER,
			receiptQuantity: DataTypes.DECIMAL(16, 4),
			plannedQuantity: DataTypes.DECIMAL(16, 4),
			completedQuantity: DataTypes.DECIMAL(16, 4),
			rejectionQuantity: DataTypes.DECIMAL(16, 4),
			rejectionUomId: DataTypes.INTEGER,
			uomId: DataTypes.INTEGER,
			deletedAt: DataTypes.DATE,
			managementTypeId: DataTypes.INTEGER,
			unitCost: DataTypes.DECIMAL(16, 4),
			total: DataTypes.DECIMAL(16, 4),
			type: DataTypes.STRING,
			noOfBundles: DataTypes.DECIMAL(16, 4),
			piecesPerBundle: DataTypes.DECIMAL(16, 4),
			loosePieces: DataTypes.DECIMAL(16, 4)
		},
		{}
	);
	ProductionReceiptItems.associate = function(models) {
		// associations can be defined here
		ProductionReceiptItems.belongsTo(models.ProductionReceipt, {
			foreignKey: 'productionReceiptId'
		});
		ProductionReceiptItems.belongsTo(models.ItemMaster, {
			foreignKey: 'productId'
		});
		ProductionReceiptItems.belongsTo(models.UOM, {
			foreignKey: 'uomId',
			as: 'receiptUOM'
		});
		ProductionReceiptItems.belongsTo(models.Warehouse, {
			foreignKey: 'warehouseId'
		});
		ProductionReceiptItems.belongsTo(models.UOM, {
			foreignKey: 'rejectionUomId',
			as: 'rejectionUOM'
		});
	};
	return ProductionReceiptItems;
};
