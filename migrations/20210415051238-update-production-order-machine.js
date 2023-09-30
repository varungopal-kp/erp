'use strict';

module.exports = {
	up: async (queryInterface, Sequelize) => {
		await queryInterface.addColumn('ProductionOrderMachines', 'employeeId', {
			type: Sequelize.INTEGER,
			references: {
				model: 'Employees',
				key: 'id'
			}
		});

		await queryInterface.addColumn('ProductionOrderMachines', 'noOfLabours', {
			type: Sequelize.INTEGER
		});
	},

	down: async (queryInterface, Sequelize) => {
		await queryInterface.removeColumn('ProductionOrderMachines', 'employeeId');

		await queryInterface.removeColumn('ProductionOrderMachines', 'noOfLabours');
	}
};
