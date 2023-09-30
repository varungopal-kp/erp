'use strict';
module.exports = (sequelize, DataTypes) => {
	const ItemManagementType = sequelize.define(
		'ItemManagementType',
		{
			name: DataTypes.STRING
		},
		{ paranoid: true }
	);
	ItemManagementType.associate = function(models) {
		// associations can be defined here
	};
	return ItemManagementType;
};
