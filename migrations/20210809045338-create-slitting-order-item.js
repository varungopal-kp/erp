'use strict';
module.exports = {
	up: (queryInterface, Sequelize) => {
		return queryInterface.createTable('SlittingOrderItems', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER
			},
			slittingOrderId: {
				allowNull: false,
				type: Sequelize.INTEGER,
				references: {
					model: 'SlittingOrders',
					key: 'id'
				}
			},
			itemMasterId: {
				type: Sequelize.INTEGER,
				references: {
					model: 'ItemMasters',
					key: 'id'
				}
			},
			quantity: Sequelize.DECIMAL(16, 4),
			uomId: {
				type: Sequelize.INTEGER,
				references: {
					model: 'UOMs',
					key: 'id'
				}
			},
			weightPerPiece: Sequelize.DECIMAL(16, 4),
			price: Sequelize.DECIMAL(16, 4),
			total: Sequelize.DECIMAL(16, 4),
			remarks: Sequelize.STRING,
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
		return queryInterface.dropTable('SlittingOrderItems');
	}
};
