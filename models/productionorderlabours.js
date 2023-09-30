'use strict';
module.exports = (sequelize, DataTypes) => {
	const ProductionOrderLabours = sequelize.define(
		'ProductionOrderLabours',
		{
			productionOrderId: DataTypes.INTEGER,
			employeeId: DataTypes.INTEGER,
			estimatedTime: DataTypes.DECIMAL(16, 4),
			costPerHour: DataTypes.DECIMAL(16, 4),
			totalTime: DataTypes.DECIMAL(16, 4),
			overTime: DataTypes.DECIMAL(16, 4),
			startDate: DataTypes.DATE,
			endDate: DataTypes.DATE,
			totalCost: DataTypes.DECIMAL(16, 4),
			remarks: DataTypes.STRING,
			deletedAt: DataTypes.DATE,
			actualTotalTime: DataTypes.DECIMAL(16, 4),
			actualTotalCost: DataTypes.DECIMAL(16, 4),
			hoursInBaseUnit: DataTypes.DECIMAL(16, 4),
			costInBaseUnit: DataTypes.DECIMAL(16, 4)
		},
		{}
	);
	ProductionOrderLabours.associate = function(models) {
		// associations can be defined here
		ProductionOrderLabours.belongsTo(models.ProductionOrder, {
			foreignKey: 'productionOrderId',
			foreignKeyConstraint: true
		});
		ProductionOrderLabours.belongsTo(models.Employee, {
			foreignKey: 'employeeId',
			foreignKeyConstraint: true
		});
		ProductionOrderLabours.hasMany(models.ProductionOrderLabourDates, {
			foreignKey: 'productionOrderLabourId',
			foreignKeyConstraint: true,
			as: 'labourDates'
		});
	};
	return ProductionOrderLabours;
};
