'use strict';
module.exports = (sequelize, DataTypes) => {
	const ProductionOrderMachines = sequelize.define(
		'ProductionOrderMachines',
		{
			productionOrderId: DataTypes.INTEGER,
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
	ProductionOrderMachines.associate = function(models) {
		// associations can be defined here
		ProductionOrderMachines.belongsTo(models.ProductionOrder, {
			foreignKey: 'productionOrderId',
			foreignKeyConstraint: true
		});
		ProductionOrderMachines.belongsTo(models.MachineCenter, {
			foreignKey: 'machineId',
			foreignKeyConstraint: true
		});
		ProductionOrderMachines.belongsTo(models.RoutingStages, {
			foreignKey: 'routingStageId',
			foreignKeyConstraint: true
		});
		ProductionOrderMachines.hasMany(models.ProductionOrderMachineDates, {
			foreignKey: 'productionOrderMachineId',
			foreignKeyConstraint: true,
			as: 'machineDates'
		});
		ProductionOrderMachines.belongsTo(models.Employee, {
			foreignKey: 'employeeId',
			foreignKeyConstraint: true
		});
	};
	return ProductionOrderMachines;
};
