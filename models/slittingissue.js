'use strict';
module.exports = (sequelize, DataTypes) => {
	const SlittingIssue = sequelize.define(
		'SlittingIssue',
		{
			docNum: DataTypes.STRING,
			series: DataTypes.STRING,
			docDate: DataTypes.DATE,
			branchId: DataTypes.INTEGER,
			slittingOrderId: DataTypes.INTEGER,
			grandTotal: DataTypes.INTEGER,
			totalQty: DataTypes.INTEGER,
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
								objectCode: 'SLIS',
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
						});
				}
			}
		}
	);
	SlittingIssue.associate = function(models) {
		// associations can be defined here
		SlittingIssue.belongsTo(models.Branch, {
			foreignKey: 'branchId',
			foreignKeyConstraint: true
		});

		SlittingIssue.belongsTo(models.SlittingOrder, {
			foreignKey: 'slittingOrderId',
			foreignKeyConstraint: true
		});

		SlittingIssue.hasMany(models.SlittingIssueItem, {
			foreignKey: 'slittingIssueId'
		});
	};
	return SlittingIssue;
};
