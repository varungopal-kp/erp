'use strict';
module.exports = {
	up: (queryInterface, Sequelize) => {
		return queryInterface.createTable('SlittingPlanItems', {
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
			itemMasterId: {
				type: Sequelize.INTEGER,
				references: {
					model: 'ItemMasters',
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
			width: Sequelize.DECIMAL(16, 4),
			thickness: Sequelize.DECIMAL(16, 4),
			coilWeight: Sequelize.DECIMAL(16, 4),
			widthConsumed: Sequelize.DECIMAL(16, 4),
			scrapWeight: Sequelize.DECIMAL(16, 4),
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
		return queryInterface.dropTable('SlittingPlanItems');
	}
};
