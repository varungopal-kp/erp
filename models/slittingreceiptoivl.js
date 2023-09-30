'use strict';
module.exports = (sequelize, DataTypes) => {
	const SlittingReceiptOIVL = sequelize.define(
		'SlittingReceiptOIVL',
		{
			slittingReceiptId: DataTypes.INTEGER,
			oivlId: DataTypes.INTEGER,
			oivlBarcodeId: DataTypes.INTEGER,
			quantity: DataTypes.DECIMAL(16, 4),
			deletedAt: DataTypes.DATE
		},
		{ paranoid: true }
	);
	SlittingReceiptOIVL.associate = function(models) {
		// associations can be defined here
		SlittingReceiptOIVL.belongsTo(models.SlittingReceipt, {
			foreignKey: 'slittingReceiptId'
		});
		SlittingReceiptOIVL.belongsTo(models.OIVL, {
			foreignKey: 'oivlId'
		});
		SlittingReceiptOIVL.belongsTo(models.OIVLBarcodes, {
			foreignKey: 'oivlBarcodeId'
		});
	};
	return SlittingReceiptOIVL;
};
