'use strict';

module.exports = {
	up: async (queryInterface, Sequelize) => {
		await queryInterface.addColumn('ProductionOrderMachinesAllocations', 'employeeId', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Employees',
				key: 'id'
			}
		});

		await queryInterface.addColumn('ProductionOrderMachinesAllocations', 'noOfLabours', {
			type: Sequelize.INTEGER
		});
	},

	down: async (queryInterface, Sequelize) => {
		await queryInterface.removeColumn('ProductionOrderMachinesAllocations', 'employeeId');

		await queryInterface.removeColumn('ProductionOrderMachinesAllocations', 'noOfLabours');
	}
};
