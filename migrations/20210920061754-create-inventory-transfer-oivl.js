'use strict';
module.exports = {
	up: (queryInterface, Sequelize) => {
		return queryInterface.createTable('InventoryTransferOIVLs', {
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
			oivlBarcodeId: {
				type: Sequelize.INTEGER,
				references: {
					model: 'OIVLBarcodes',
					key: 'id'
				}
			},
			inQty: Sequelize.DECIMAL(16, 4),
			outQty: Sequelize.DECIMAL(16, 4),
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
			},
			deletedAt: {
				type: Sequelize.DATE
			}
		});
	},
	down: (queryInterface, Sequelize) => {
		return queryInterface.dropTable('InventoryTransferOIVLs');
	}
};
