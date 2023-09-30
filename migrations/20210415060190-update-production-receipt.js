'use strict';

module.exports = {
	up: async (queryInterface, Sequelize) => {
		await queryInterface.addColumn('ProductionReceipts', 'overtime', {
			type: Sequelize.NUMERIC
		});
	},

	down: async (queryInterface, Sequelize) => {
		await queryInterface.removeColumn('ProductionReceipts', 'overtime');
	}
};
