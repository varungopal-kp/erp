'use strict';

module.exports = {
	up: async (queryInterface, Sequelize) => {
		await queryInterface.addColumn('BillOfMaterials', 'totalCost', {
			type: Sequelize.NUMERIC,
			defaultValue: 0
		});

		await queryInterface.addColumn('BillOfMaterials', 'totalCostInBaseUnit', {
			type: Sequelize.NUMERIC,
			defaultValue: 0
		});

		await queryInterface.addColumn('BOMComponents', 'totalCost', {
			type: Sequelize.NUMERIC,
			defaultValue: 0
		});

		await queryInterface.addColumn('BOMComponents', 'isDefault', {
			type: Sequelize.BOOLEAN,
			defaultValue: false
		});

		await queryInterface.addColumn('BOMMachines', 'totalCost', {
			type: Sequelize.NUMERIC,
			defaultValue: 0
		});

		await queryInterface.addColumn('BOMLabours', 'totalCost', {
			type: Sequelize.NUMERIC,
			defaultValue: 0
		});
	},

	down: async (queryInterface, Sequelize) => {
		await queryInterface.removeColumn('BillOfMaterials', 'totalCost');
		await queryInterface.removeColumn('BOMComponents', 'totalCost');
		await queryInterface.removeColumn('BOMMachines', 'totalCost');
		await queryInterface.removeColumn('BOMLabours', 'totalCost');
	}
};
