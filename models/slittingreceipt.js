'use strict';
module.exports = (sequelize, DataTypes) => {
	const SlittingReceipt = sequelize.define(
		'SlittingReceipt',
		{
			docNum: DataTypes.STRING,
			series: DataTypes.STRING,
			docDate: DataTypes.DATE,
			branchId: DataTypes.INTEGER,
			slittingOrderId: DataTypes.INTEGER,
			grandTotal: DataTypes.INTEGER,
			remarks: DataTypes.STRING,
			status: DataTypes.STRING,
			month: DataTypes.INTEGER,
			year: DataTypes.INTEGER,
			quarter: DataTypes.INTEGER,
			createdUser: DataTypes.UUID,
			deletedAt: DataTypes.DATE
		},
		{
			paranoid: true,
			hooks: {
				afterCreate: function(self, options, fn) {
					return sequelize.models.TransactionNumbers
						.findOne({
							where: {
								objectCode: 'SLRT',
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
	SlittingReceipt.associate = function(models) {
		// associations can be defined here
		SlittingReceipt.belongsTo(models.Branch, {
			foreignKey: 'branchId',
			foreignKeyConstraint: true
		});

		SlittingReceipt.belongsTo(models.SlittingOrder, {
			foreignKey: 'slittingOrderId',
			foreignKeyConstraint: true
		});

		SlittingReceipt.hasMany(models.SlittingReceiptItem, {
			foreignKey: 'slittingReceiptId'
		});
	};
	return SlittingReceipt;
};
