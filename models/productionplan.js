'use strict';
module.exports = (sequelize, DataTypes) => {
	const ProductionPlan = sequelize.define(
		'ProductionPlan',
		{
			docNum: DataTypes.STRING,
			series: DataTypes.STRING,
			docDate: DataTypes.DATE,
			startingDate: DataTypes.DATE,
			branchId: DataTypes.INTEGER,
			productionUnitId: DataTypes.INTEGER,
			warehouseId: DataTypes.INTEGER,
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
								objectCode: 'PRPL',
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
	ProductionPlan.associate = function(models) {
		// associations can be defined here
		ProductionPlan.belongsTo(models.Branch, {
			foreignKey: 'branchId',
			foreignKeyConstraint: true
		});

		ProductionPlan.belongsTo(models.ProductionUnit, {
			foreignKey: 'productionUnitId',
			foreignKeyConstraint: true
		});

		ProductionPlan.belongsTo(models.Warehouse, {
			foreignKey: 'warehouseId',
			foreignKeyConstraint: true
		});

		ProductionPlan.belongsTo(models.User, {
			foreignKey: 'createdUser',
			foreignKeyConstraint: true
		});

		ProductionPlan.hasMany(models.ProductionPlanItems, {
			foreignKey: 'productionPlanId'
		});

		ProductionPlan.hasMany(models.ProductionOrder, {
			foreignKey: 'productionPlanId'
		});
	};
	return ProductionPlan;
};
