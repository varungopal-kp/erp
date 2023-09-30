'use strict';
module.exports = (sequelize, DataTypes) => {
	const SlittingPlan = sequelize.define(
		'SlittingPlan',
		{
			docNum: DataTypes.STRING,
			series: DataTypes.STRING,
			docDate: DataTypes.DATE,
			startingDate: DataTypes.DATE,
			endDate: DataTypes.DATE,
			branchId: DataTypes.INTEGER,
			productionUnitId: DataTypes.INTEGER,
			warehouseId: DataTypes.INTEGER,
			remarks: DataTypes.STRING,
			status: DataTypes.STRING,
			month: DataTypes.INTEGER,
			year: DataTypes.INTEGER,
			quarter: DataTypes.INTEGER,
			createdUser: DataTypes.UUID,
			deleted: DataTypes.BOOLEAN,
			deletedAt: DataTypes.DATE
		},
		{
			paranoid: true,
			hooks: {
				afterCreate: function(self, options, fn) {
					return sequelize.models.TransactionNumbers
						.findOne({
							where: {
								objectCode: 'SLP',
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
	SlittingPlan.associate = function(models) {
		// associations can be defined here
		SlittingPlan.belongsTo(models.Branch, {
			foreignKey: 'branchId',
			foreignKeyConstraint: true
		});

		SlittingPlan.belongsTo(models.ProductionUnit, {
			foreignKey: 'productionUnitId',
			foreignKeyConstraint: true
		});

		SlittingPlan.belongsTo(models.Warehouse, {
			foreignKey: 'warehouseId',
			foreignKeyConstraint: true
		});

		SlittingPlan.belongsTo(models.User, {
			foreignKey: 'createdUser',
			foreignKeyConstraint: true
		});

		SlittingPlan.hasMany(models.SlittingPlanItems, {
			foreignKey: 'slittingPlanId'
		});

		SlittingPlan.hasMany(models.SlittingOrder, {
			foreignKey: 'slittingPlanId'
		});
	};
	return SlittingPlan;
};
