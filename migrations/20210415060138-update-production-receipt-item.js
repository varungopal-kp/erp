'use strict';

module.exports = {
	up: async (queryInterface, Sequelize) => {
		await queryInterface.addColumn('ProductionReceiptItems', 'noOfBundles', {
			type: Sequelize.NUMERIC
		});
	},

	down: async (queryInterface, Sequelize) => {
		await queryInterface.removeColumn('ProductionReceiptItems', 'noOfBundles');
	}
};
