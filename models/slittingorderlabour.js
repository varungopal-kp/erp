'use strict';
module.exports = (sequelize, DataTypes) => {
	const SlittingOrderLabour = sequelize.define(
		'SlittingOrderLabour',
		{
			slittingOrderId: DataTypes.INTEGER,
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
	SlittingOrderLabour.associate = function(models) {
		// associations can be defined here
		SlittingOrderLabour.belongsTo(models.SlittingOrder, {
			foreignKey: 'slittingOrderId',
			foreignKeyConstraint: true
		});
		SlittingOrderLabour.belongsTo(models.Employee, {
			foreignKey: 'employeeId',
			foreignKeyConstraint: true
		});
	};
	return SlittingOrderLabour;
};
