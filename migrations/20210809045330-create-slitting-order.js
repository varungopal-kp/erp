'use strict';
module.exports = {
	up: (queryInterface, Sequelize) => {
		return queryInterface.createTable('SlittingOrders', {
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
			startDate: Sequelize.DATE,
			endDate: Sequelize.DATE,
			branchId: {
				allowNull: false,
				type: Sequelize.INTEGER,
				references: {
					model: 'Branches',
					key: 'id'
				}
			},
			slittingPlanId: {
				type: Sequelize.INTEGER,
				references: {
					model: 'SlittingPlans',
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
			oivlId: {
				allowNull: false,
				type: Sequelize.INTEGER,
				references: {
					model: 'OIVLs',
					key: 'id'
				}
			},
			productionUnitId: {
				type: Sequelize.INTEGER,
				references: {
					model: 'ProductionUnits',
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
			width: Sequelize.DECIMAL(16, 4),
			thickness: Sequelize.DECIMAL(16, 4),
			coilWeight: Sequelize.DECIMAL(16, 4),
			widthConsumed: Sequelize.DECIMAL(16, 4),
			scrapWeight: Sequelize.DECIMAL(16, 4),
			remarks: Sequelize.STRING,
			status: Sequelize.STRING,
			month: Sequelize.INTEGER,
			year: Sequelize.INTEGER,
			quarter: Sequelize.INTEGER,
			createdUser: Sequelize.UUID,
			deleted: {
				type: Sequelize.BOOLEAN,
				defaultValue: false
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
		return queryInterface.dropTable('SlittingOrders');
	}
};
