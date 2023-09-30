'use strict';
module.exports = (sequelize, DataTypes) => {
	const BOMLabours = sequelize.define(
		'BOMLabours',
		{
			bomId: DataTypes.INTEGER,
			employeeId: DataTypes.INTEGER,
			estimatedTime: DataTypes.DECIMAL(16, 4),
			hoursInBaseUnit: DataTypes.DECIMAL(16, 4),
			hoursPerUnit: DataTypes.DECIMAL(16, 4),
			cost: DataTypes.DECIMAL(16, 4),
			costInBaseUnit: DataTypes.DECIMAL(16, 4),
			remarks: DataTypes.STRING,
			deletedAt: DataTypes.DATE,
			totalCost: DataTypes.DECIMAL(16, 4)
		},
		{}
	);
	BOMLabours.associate = function(models) {
		// associations can be defined here
		BOMLabours.belongsTo(models.BillOfMaterials, {
			foreignKey: 'bomId'
		});
		BOMLabours.belongsTo(models.Employee, {
			foreignKey: 'employeeId'
		});
	};
	return BOMLabours;
};
