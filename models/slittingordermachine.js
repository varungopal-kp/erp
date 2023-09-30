'use strict';
module.exports = (sequelize, DataTypes) => {
	const SlittingOrderMachine = sequelize.define(
		'SlittingOrderMachine',
		{
			slittingOrderId: DataTypes.INTEGER,
			routingStageNumber: DataTypes.STRING,
			routingStageId: DataTypes.INTEGER,
			machineId: DataTypes.INTEGER,
			estimatedTime: DataTypes.DECIMAL(16, 4),
			costPerHour: DataTypes.DECIMAL(16, 4),
			totalTime: DataTypes.DECIMAL(16, 4),
			startDate: DataTypes.DATE,
			endDate: DataTypes.DATE,
			totalCost: DataTypes.DECIMAL(16, 4),
			remarks: DataTypes.STRING,
			deletedAt: DataTypes.DATE,
			actualTotalTime: DataTypes.DECIMAL(16, 4),
			actualTotalCost: DataTypes.DECIMAL(16, 4),
			hoursInBaseUnit: DataTypes.DECIMAL(16, 4),
			costInBaseUnit: DataTypes.DECIMAL(16, 4),
			employeeId: DataTypes.INTEGER,
			noOfLabours: DataTypes.INTEGER
		},
		{}
	);
	SlittingOrderMachine.associate = function(models) {
		// associations can be defined here
		SlittingOrderMachine.belongsTo(models.SlittingOrder, {
			foreignKey: 'slittingOrderId',
			foreignKeyConstraint: true
		});
		SlittingOrderMachine.belongsTo(models.MachineCenter, {
			foreignKey: 'machineId',
			foreignKeyConstraint: true
		});
		SlittingOrderMachine.belongsTo(models.RoutingStages, {
			foreignKey: 'routingStageId',
			foreignKeyConstraint: true
		});
		SlittingOrderMachine.hasMany(models.ProductionOrderMachineDates, {
			foreignKey: 'productionOrderMachineId',
			foreignKeyConstraint: true,
			as: 'machineDates'
		});
		SlittingOrderMachine.belongsTo(models.Employee, {
			foreignKey: 'employeeId',
			foreignKeyConstraint: true
		});
	};
	return SlittingOrderMachine;
};
