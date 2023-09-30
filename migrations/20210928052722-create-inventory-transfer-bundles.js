'use strict';
module.exports = {
	up: (queryInterface, Sequelize) => {
		return queryInterface.createTable('InventoryTransferBundles', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER
			},
			inventoryTransferId: {
				type: Sequelize.INTEGER,
				references: {
					model: 'InventoryTransfers',
					key: 'id'
				}
			},
			oivlId: {
				type: Sequelize.INTEGER,
				references: {
					model: 'OIVLs',
					key: 'id'
				}
			},
			oivlBundleId: {
				type: Sequelize.INTEGER,
				references: {
					model: 'OIVLBundleNumbers',
					key: 'id'
				}
			},
			type: {
				type: Sequelize.STRING
			},
			createdAt: {
				allowNull: false,
				type: Sequelize.DATE,
				defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
			},
			updatedAt: {
				allowNull: false,
				type: Sequelize.DATE,
				defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
				onUpdate: Sequelize.literal('CURRENT_TIMESTAMP')
			}
		});
	},
	down: (queryInterface, Sequelize) => {
		return queryInterface.dropTable('InventoryTransferBundles');
	}
};
