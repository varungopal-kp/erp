'use strict';
module.exports = {
	up: (queryInterface, Sequelize) => {
		return queryInterface.createTable('SlittingPlanItemDetails', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER
			},
			slittingPlanId: {
				allowNull: false,
				type: Sequelize.INTEGER,
				references: {
					model: 'SlittingPlans',
					key: 'id'
				}
			},
			slittingPlanItemId: {
				allowNull: false,
				type: Sequelize.INTEGER,
				references: {
					model: 'SlittingPlanItems',
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
		return queryInterface.dropTable('SlittingPlanItemDetails');
	}
};
