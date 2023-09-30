'use strict';

module.exports = {
	up: async (queryInterface, Sequelize) => {
		await queryInterface.addColumn('ProductionReceiptItems', 'piecesPerBundle', {
			type: Sequelize.NUMERIC
		});
	},

	down: async (queryInterface, Sequelize) => {
		await queryInterface.removeColumn('ProductionReceiptItems', 'piecesPerBundle');
	}
};
