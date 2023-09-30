'use strict';
module.exports = {
	up: (queryInterface, Sequelize) => {
		return queryInterface.createTable('SlittingReceiptOIVLs', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER
			},
			slittingReceiptId: {
				allowNull: false,
				type: Sequelize.INTEGER,
				references: {
					model: 'SlittingReceipts',
					key: 'id'
				}
			},
			oivlId: {
				allowNull: false,
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
			quantity: Sequelize.DECIMAL(16, 4),

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
		return queryInterface.dropTable('SlittingReceiptOIVLs');
	}
};
