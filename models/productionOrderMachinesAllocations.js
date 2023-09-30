'use strict';
module.exports = (sequelize, DataTypes) => {
	const ProductionOrderMachinesAllocations = sequelize.define(
		'ProductionOrderMachinesAllocations',
		{
			productionOrderId: DataTypes.INTEGER,
			machineId: DataTypes.INTEGER,
			date: DataTypes.DATE,
			numberOfHours: DataTypes.DECIMAL(16, 4),
			status: DataTypes.STRING,
			productionUnitId: DataTypes.INTEGER,
			month: DataTypes.INTEGER,
			year: DataTypes.INTEGER,
			quarter: DataTypes.INTEGER,
			remainingHours: DataTypes.DECIMAL(16, 4),
			employeeId: DataTypes.INTEGER,
			noOfLabours: DataTypes.INTEGER
		},
		{}
	);
	ProductionOrderMachinesAllocations.associate = function(models) {
		// associations can be defined here
		ProductionOrderMachinesAllocations.belongsTo(models.ProductionOrder, {
			foreignKey: 'productionOrderId',
			foreignKeyConstraint: true,
			as: 'Order'
		});
		ProductionOrderMachinesAllocations.belongsTo(models.MachineCenter, {
			foreignKey: 'machineId',
			foreignKeyConstraint: true
		});
		ProductionOrderMachinesAllocations.belongsTo(models.ProductionUnit, {
			foreignKey: 'productionUnitId',
			foreignKeyConstraint: true,
			as: 'Unit'
		});
		ProductionOrderMachinesAllocations.belongsTo(models.Employee, {
			foreignKey: 'employeeId',
			foreignKeyConstraint: true
		});
	};
	return ProductionOrderMachinesAllocations;
};
