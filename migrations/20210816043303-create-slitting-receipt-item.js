'use strict';
module.exports = {
	up: (queryInterface, Sequelize) => {
		return queryInterface.createTable('SlittingReceiptItems', {
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
			productId: {
				allowNull: false,
				type: Sequelize.INTEGER,
				references: {
					model: 'ItemMasters',
					key: 'id'
				}
			},
			warehouseId: {
				allowNull: false,
				type: Sequelize.INTEGER,
				references: {
					model: 'Warehouses',
					key: 'id'
				}
			},
			quantity: Sequelize.DECIMAL(16, 4),
			uomId: {
				allowNull: false,
				type: Sequelize.INTEGER,
				references: {
					model: 'UOMs',
					key: 'id'
				}
			},
			plannedQuantity: Sequelize.DECIMAL(16, 4),
			price: Sequelize.DECIMAL(16, 4),
			total: Sequelize.DECIMAL(16, 4),
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
		return queryInterface.dropTable('SlittingReceiptItems');
	}
};
