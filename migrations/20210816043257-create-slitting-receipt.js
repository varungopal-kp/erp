'use strict';
module.exports = {
	up: (queryInterface, Sequelize) => {
		return queryInterface.createTable('SlittingReceipts', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER
			},
			docNum: {
				allowNull: false,
				type: Sequelize.STRING
			},
			series: {
				allowNull: false,
				type: Sequelize.STRING
			},
			docDate: Sequelize.DATE,
			branchId: {
				allowNull: false,
				type: Sequelize.INTEGER,
				references: {
					model: 'Branches',
					key: 'id'
				}
			},
			slittingOrderId: {
				allowNull: false,
				type: Sequelize.INTEGER,
				references: {
					model: 'SlittingOrders',
					key: 'id'
				}
			},
			grandTotal: Sequelize.DECIMAL(16, 4),
			remarks: Sequelize.STRING,
			status: Sequelize.STRING,
			month: Sequelize.INTEGER,
			year: Sequelize.INTEGER,
			quarter: Sequelize.INTEGER,
			createdUser: Sequelize.UUID,
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
		return queryInterface.dropTable('SlittingReceipts');
	}
};
