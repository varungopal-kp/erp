'use strict';
module.exports = {
	up: (queryInterface, Sequelize) => {
		return queryInterface.createTable('SlittingOrderMachines', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER
			},
			slittingOrderId: {
				type: Sequelize.INTEGER,
				references: {
					model: 'SlittingOrders',
					key: 'id'
				}
			},
			machineId: {
				type: Sequelize.INTEGER,
				references: {
					model: 'MachineCenters',
					key: 'id'
				}
			},
			routingStageId: {
				type: Sequelize.INTEGER
			},
			routingStageNumber: Sequelize.STRING,
			estimatedTime: Sequelize.DECIMAL(16, 4),
			costPerHour: Sequelize.DECIMAL(16, 4),
			startDate: Sequelize.DATE,
			endDate: Sequelize.DATE,
			totalCost: Sequelize.DECIMAL(16, 4),
			remarks: Sequelize.STRING,
			totalTime: Sequelize.DECIMAL(16, 4),
			actualTotalTime: Sequelize.DECIMAL(16, 4),
			actualTotalCost: Sequelize.DECIMAL(16, 4),
			costInBaseUnit: Sequelize.DECIMAL(16, 4),
			hoursInBaseUnit: Sequelize.DECIMAL(16, 4),
			employeeId: Sequelize.INTEGER,
			noOfLabours: Sequelize.INTEGER,
			deletedAt: Sequelize.DATE,
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
		return queryInterface.dropTable('SlittingOrderMachines');
	}
};
