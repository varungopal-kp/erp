'use strict';

module.exports = {
	up: async (queryInterface, Sequelize) => {
		await queryInterface.addColumn('ProductionOrders', 'defaultProductReceived', {
			type: Sequelize.NUMERIC,
			defaultValue: 0
		});

		await queryInterface.addColumn('ProductionOrders', 'defaultProductUOMId', {
			type: Sequelize.INTEGER,
			references: {
				model: 'UOMs',
				key: 'id'
			}
		});

		await queryInterface.addColumn('ProductionOrders', 'defaultComponentIssued', {
			type: Sequelize.NUMERIC,
			defaultValue: 0
		});

		await queryInterface.addColumn('ProductionOrders', 'defaultComponentId', {
			type: Sequelize.INTEGER,
			references: {
				model: 'ItemMasters',
				key: 'id'
			}
		});

		await queryInterface.addColumn('ProductionOrders', 'defaultComponentUOMId', {
			type: Sequelize.INTEGER,
			references: {
				model: 'UOMs',
				key: 'id'
			}
		});
	},

	down: async (queryInterface, Sequelize) => {
		await queryInterface.removeColumn('ProductionOrders', 'defaultProductReceived');
		await queryInterface.removeColumn('ProductionOrders', 'defaultProductUOMId');
		await queryInterface.removeColumn('ProductionOrders', 'defaultComponentIssued');
		await queryInterface.removeColumn('ProductionOrders', 'defaultComponentId');
		await queryInterface.removeColumn('ProductionOrders', 'defaultComponentUOMId');
	}
};
