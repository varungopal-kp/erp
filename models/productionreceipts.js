'use strict';
module.exports = (sequelize, DataTypes) => {
	const ProductionReceipt = sequelize.define(
		'ProductionReceipt',
		{
			docNum: DataTypes.STRING,
			series: DataTypes.STRING,
			docDate: DataTypes.DATE,
			branchId: DataTypes.INTEGER,
			productionOrderId: DataTypes.INTEGER,
			remarks: DataTypes.STRING,
			createdUser: DataTypes.UUID,
			deleted: DataTypes.BOOLEAN,
			deletedAt: DataTypes.DATE,
			grandTotal: DataTypes.DECIMAL(16, 4),
			totalQty: DataTypes.DECIMAL(16, 4),
			month: DataTypes.INTEGER,
			year: DataTypes.INTEGER,
			quarter: DataTypes.INTEGER,
			verified: DataTypes.BOOLEAN,
			overtime: DataTypes.DECIMAL(16, 4)
		},
		{
			hooks: {
				afterCreate: function(self, options, fn) {
					return sequelize.models.TransactionNumbers
						.findOne({
							where: {
								objectCode: 'PRPT',
								nextNumber: self.docNum,
								series: self.series
							}
						})
						.then((res) => {
							res
								.update({
									nextNumber: res.nextNumber + 1
								})
								.catch((error) => {
									console.log(error);
									return Promise.reject(new Error(' Transaction Number updating fails'));
								});
						})
						.catch((errors) => {
							console.log(`No document number with next number ${self.docNum}`);
							// return Promise.reject(new Error(`No document number with next number ${self.docNum}`))
						});
				}
			}
		}
	);
	ProductionReceipt.associate = function(models) {
		// associations can be defined here
		ProductionReceipt.belongsTo(models.ProductionOrder, {
			foreignKey: 'productionOrderId'
		});
		ProductionReceipt.hasMany(models.ProductionReceiptItems, {
			foreignKey: 'productionReceiptId'
		});

		ProductionReceipt.hasMany(models.ProductionReceiptOIVL, {
			foreignKey: 'productionReceiptId'
		});

		ProductionReceipt.hasMany(models.ProductionOrderBundleNumbers, {
			foreignKey: 'productionReceiptId',
			as: 'ProductionReceiptBundles'
		});
	};
	return ProductionReceipt;
};
