'use strict';
module.exports = (sequelize, DataTypes) => {
	const BOMMachines = sequelize.define(
		'BOMMachines',
		{
			bomId: DataTypes.INTEGER,
			routingStageNumber: DataTypes.STRING,
			routingStageId: DataTypes.INTEGER,
			machineId: DataTypes.INTEGER,
			estimatedTime: DataTypes.DECIMAL(16, 4),
			hoursPerUnit: DataTypes.DECIMAL(16, 4),
			hoursInBaseUnit: DataTypes.DECIMAL(16, 4),
			cost: DataTypes.DECIMAL(16, 4),
			costInBaseUnit: DataTypes.DECIMAL(16, 4),
			noOfLabours: DataTypes.INTEGER,
			remarks: DataTypes.STRING,
			deletedAt: DataTypes.DATE,
			totalCost: DataTypes.DECIMAL(16, 4)
		},
		{}
	);
	BOMMachines.associate = function(models) {
		// associations can be defined here
		BOMMachines.belongsTo(models.BillOfMaterials, {
			foreignKey: 'bomId'
		});
		BOMMachines.belongsTo(models.MachineCenter, {
			foreignKey: 'machineId'
		});
		BOMMachines.belongsTo(models.RoutingStages, {
			foreignKey: 'routingStageId'
		});
	};
	return BOMMachines;
};
