'use strict';
module.exports = {
	up: (queryInterface, Sequelize) => {
		return queryInterface.createTable('ProductionPlanItems', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER
			},
			productionPlanId: {
				allowNull: false,
				type: Sequelize.INTEGER,
				references: {
					model: 'ProductionPlans',
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
			thickness: Sequelize.DECIMAL(16, 4),
			currentStock: Sequelize.DECIMAL(16, 4),
			orderQuantity: Sequelize.DECIMAL(16, 4),
			productionQuantityInPcs: Sequelize.DECIMAL(16, 4),
			productionQuantityInMT: Sequelize.DECIMAL(16, 4),
			semiFinishedItemId: {
				type: Sequelize.INTEGER,
				references: {
					model: 'ItemMasters',
					key: 'id'
				}
			},
			semiFinishedItemStock: Sequelize.DECIMAL(16, 4),
			needToSlit: Sequelize.DECIMAL(16, 4),
			rawMaterialId: {
				type: Sequelize.INTEGER,
				references: {
					model: 'ItemMasters',
					key: 'id'
				}
			},
			rawMaterialStock: Sequelize.DECIMAL(16, 4),
			routingStageId: {
				type: Sequelize.INTEGER,
				references: {
					model: 'RoutingStages',
					key: 'id'
				}
			},
			endingDate: Sequelize.DATE,
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
		return queryInterface.dropTable('ProductionPlanItems');
	}
};
