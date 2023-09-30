'use strict';
module.exports = (sequelize, DataTypes) => {
	const ProductionOrder = sequelize.define(
		'ProductionOrder',
		{
			docNum: {
				type: DataTypes.STRING,
				validate: {
					notEmpty: true,
					isUnique: function(value, next) {
						var self = this;
						ProductionOrder.findOne({
							where: {
								docNum: value.toString(),
								series: self.series
							}
						})
							.then(function(result) {
								// reject if a different user wants to use the same docNum

								if (result && self.id !== result.id) {
									return next('docNum already in use!');
								}
								return next();
							})
							.catch(function(err) {
								return next(err);
							});
					}
				}
			},
			series: DataTypes.STRING,
			docDate: DataTypes.DATE,
			branchId: DataTypes.INTEGER,
			productionPlanId: DataTypes.INTEGER,
			productId: DataTypes.INTEGER,
			bomId: DataTypes.INTEGER,
			description: DataTypes.STRING,
			customerOrderNo: DataTypes.STRING,
			dueDate: DataTypes.DATE,
			startDate: DataTypes.DATE,
			endDate: DataTypes.DATE,
			releaseDate: DataTypes.DATE,
			productionTypeId: DataTypes.INTEGER,
			plannedQuantity: DataTypes.DECIMAL(16, 4),
			receivedQuantity: DataTypes.DECIMAL(16, 4),
			uomId: DataTypes.INTEGER,
			warehouseId: DataTypes.INTEGER,
			unitCost: DataTypes.DECIMAL(16, 4),
			totalCost: DataTypes.DECIMAL(16, 4),
			attachments: DataTypes.ARRAY(DataTypes.JSONB),
			createdUser: DataTypes.UUID,
			statusId: DataTypes.INTEGER,
			deleted: DataTypes.BOOLEAN,
			deletedAt: DataTypes.DATE,
			salesOrderId: DataTypes.INTEGER,
			salesOrders: DataTypes.ARRAY(DataTypes.JSONB),
			actualQuantity: DataTypes.DECIMAL(16, 4),
			actualUnitCost: DataTypes.DECIMAL(16, 4),
			actualTotalCost: DataTypes.DECIMAL(16, 4),
			salesOrderPlanId: DataTypes.INTEGER,
			barcode: DataTypes.STRING,
			initialNumber: DataTypes.INTEGER,
			numberOfCopies: DataTypes.INTEGER,
			productionUnitId: DataTypes.INTEGER,
			rejectedQty: DataTypes.DECIMAL(16, 4),
			month: DataTypes.INTEGER,
			year: DataTypes.INTEGER,
			quarter: DataTypes.INTEGER,
			deletedAt: DataTypes.DATE,
			defaultProductReceived: DataTypes.DECIMAL(16, 4),
			defaultProductUOMId: DataTypes.INTEGER,
			defaultComponentIssued: DataTypes.DECIMAL(16, 4),
			defaultComponentId: DataTypes.INTEGER,
			defaultComponentUOMId: DataTypes.INTEGER,
			damageQuantity: DataTypes.INTEGER,
			damageUOMId: DataTypes.INTEGER,
			damageWarehouseId: DataTypes.INTEGER
		},
		{
			hooks: {
				afterCreate: function(self, options, fn) {
					return sequelize.models.TransactionNumbers
						.findOne({
							where: {
								objectCode: 'POR',
								nextNumber: self.docNum,
								series: self.series
							}
						})
						.then((res) => {
							res
								.update({
									nextNumber: res.nextNumber + 1
								})
								.catch((error) => {
									console.log(error);
									return Promise.reject(new Error(' Transaction Number updating fails'));
								});
						})
						.catch((errors) => {
							console.log(`No document number with next number ${self.docNum}`);
							// return Promise.reject(new Error(`No document number with next number ${self.docNum}`))
						});
				}
			},
			getterMethods: {
				// seriesDocNum: function () {
				//   return this.getDataValue('series') + '-' + this.getDataValue('docNum')
				// }
			},
			paranoid: true
		}
	);
	ProductionOrder.associate = function(models) {
		// associations can be defined here
		ProductionOrder.belongsTo(models.Branch, {
			foreignKey: 'branchId',
			foreignKeyConstraint: true
		});

		ProductionOrder.belongsTo(models.ProductionPlan, {
			foreignKey: 'productionPlanId',
			foreignKeyConstraint: true
		});

		ProductionOrder.belongsTo(models.ItemMaster, {
			foreignKey: 'productId',
			foreignKeyConstraint: true
		});
		ProductionOrder.belongsTo(models.UOM, {
			foreignKey: 'uomId',
			foreignKeyConstraint: true
		});
		ProductionOrder.belongsTo(models.Warehouse, {
			foreignKey: 'warehouseId',
			foreignKeyConstraint: true
		});
		ProductionOrder.belongsTo(models.User, {
			foreignKey: 'createdUser',
			foreignKeyConstraint: true
		});
		ProductionOrder.belongsTo(models.Status, {
			foreignKey: 'statusId',
			foreignKeyConstraint: true
		});
		ProductionOrder.hasMany(models.ProductionOrderComponents, {
			foreignKey: 'productionOrderId',
			foreignKeyConstraint: true
		});
		ProductionOrder.hasMany(models.ProductionOrderMachines, {
			foreignKey: 'productionOrderId',
			foreignKeyConstraint: true
		});
		ProductionOrder.hasMany(models.ProductionOrderLabours, {
			foreignKey: 'productionOrderId',
			foreignKeyConstraint: true
		});
		ProductionOrder.hasMany(models.ProductionOrderMachinesAllocations, {
			foreignKey: 'productionOrderId',
			foreignKeyConstraint: true
		});
		ProductionOrder.hasMany(models.ProductionOrderMachineDates, {
			foreignKey: 'productionOrderId',
			foreignKeyConstraint: true,
			as: 'machineDates'
		});
		ProductionOrder.hasMany(models.ProductionOrderLabourDates, {
			foreignKey: 'productionOrderId',
			foreignKeyConstraint: true,
			as: 'labourDates'
		});
		ProductionOrder.hasOne(models.ProductionCostingSummary, {
			foreignKey: 'productionOrderId',
			foreignKeyConstraint: true
		});
		ProductionOrder.belongsTo(models.ProductionUnit, {
			foreignKey: 'productionUnitId',
			foreignKeyConstraint: true
		});
		ProductionOrder.hasMany(models.ProductionIssue, {
			foreignKey: 'productionOrderId',
			foreignKeyConstraint: true
		});
		ProductionOrder.hasMany(models.ProductionReceipt, {
			foreignKey: 'productionOrderId',
			foreignKeyConstraint: true
		});
		ProductionOrder.hasMany(models.ProductionOrderBundleNumbers, {
			foreignKey: 'productionOrderId',
			foreignKeyConstraint: true
		});
		ProductionOrder.hasMany(models.ProductionOrderLogs, {
			foreignKey: 'productionOrderId',
			foreignKeyConstraint: true
		});
		ProductionOrder.hasMany(models.OIVLBundleNumbers, {
			foreignKey: 'productionOrderId',
			foreignKeyConstraint: true
		});
		ProductionOrder.belongsTo(models.UOM, {
			foreignKey: 'defaultProductUOMId',
			foreignKeyConstraint: true,
			as: 'DefaultProductUOM'
		});
		ProductionOrder.belongsTo(models.UOM, {
			foreignKey: 'defaultComponentUOMId',
			foreignKeyConstraint: true,
			as: 'DefaultComponentUOM'
		});
		ProductionOrder.belongsTo(models.ItemMaster, {
			foreignKey: 'defaultComponentId',
			foreignKeyConstraint: true,
			as: 'DefaultComponent'
		});
		ProductionOrder.belongsTo(models.Warehouse, {
			foreignKey: 'damageWarehouseId',
			foreignKeyConstraint: true,
			as: 'DamageWarehouse'
		});
		ProductionOrder.belongsTo(models.UOM, {
			foreignKey: 'damageUOMId',
			foreignKeyConstraint: true,
			as: 'DamageUOM'
		});
	};
	return ProductionOrder;
};
