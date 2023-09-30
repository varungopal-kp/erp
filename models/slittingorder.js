'use strict';
module.exports = (sequelize, DataTypes) => {
	const SlittingOrder = sequelize.define(
		'SlittingOrder',
		{
			docNum: DataTypes.STRING,
			series: DataTypes.STRING,
			docDate: DataTypes.DATE,
			startDate: DataTypes.DATE,
			endDate: DataTypes.DATE,
			branchId: DataTypes.INTEGER,
			slittingPlanId: DataTypes.INTEGER,
			productId: DataTypes.INTEGER,
			oivlId: DataTypes.INTEGER,
			productionUnitId: DataTypes.INTEGER,
			warehouseId: DataTypes.INTEGER,
			width: DataTypes.INTEGER,
			thickness: DataTypes.INTEGER,
			coilWeight: DataTypes.INTEGER,
			widthConsumed: DataTypes.INTEGER,
			scrapWeight: DataTypes.INTEGER,
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
								objectCode: 'SLOR',
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
	SlittingOrder.associate = function(models) {
		// associations can be defined here
		SlittingOrder.belongsTo(models.Branch, {
			foreignKey: 'branchId',
			foreignKeyConstraint: true
		});

		SlittingOrder.belongsTo(models.SlittingPlan, {
			foreignKey: 'slittingPlanId',
			foreignKeyConstraint: true
		});

		SlittingOrder.belongsTo(models.ProductionUnit, {
			foreignKey: 'productionUnitId',
			foreignKeyConstraint: true
		});

		SlittingOrder.belongsTo(models.Warehouse, {
			foreignKey: 'warehouseId',
			foreignKeyConstraint: true
		});

		SlittingOrder.belongsTo(models.ItemMaster, {
			foreignKey: 'productId',
			foreignKeyConstraint: true
		});

		SlittingOrder.belongsTo(models.OIVL, {
			foreignKey: 'oivlId',
			foreignKeyConstraint: true
		});

		SlittingOrder.belongsTo(models.User, {
			foreignKey: 'createdUser',
			foreignKeyConstraint: true
		});

		SlittingOrder.hasMany(models.SlittingOrderItem, {
			foreignKey: 'slittingOrderId'
		});

		SlittingOrder.hasMany(models.SlittingOrderMachine, {
			foreignKey: 'slittingOrderId'
		});

		SlittingOrder.hasMany(models.SlittingOrderLabour, {
			foreignKey: 'slittingOrderId'
		});
	};
	return SlittingOrder;
};
