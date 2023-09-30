'use strict';
module.exports = (sequelize, DataTypes) => {
	const PurchaseOrderItem = sequelize.define(
		'PurchaseOrderItem',
		{
			purchaseOrderId: DataTypes.INTEGER,
			itemMasterId: DataTypes.INTEGER,
			description: DataTypes.STRING,
			warehouseId: DataTypes.INTEGER,
			quantity: DataTypes.DECIMAL(16, 4),
			copiedQty: DataTypes.DECIMAL(16, 4),
			openQty: DataTypes.DECIMAL(16, 4),
			uomId: DataTypes.INTEGER,
			price: DataTypes.DECIMAL(16, 4),
			discountPerc: DataTypes.DECIMAL(16, 4),
			discount: DataTypes.DECIMAL(16, 4),
			priceAfterDiscount: DataTypes.DECIMAL(16, 4),
			taxPerc: DataTypes.DECIMAL(16, 4),
			tax: DataTypes.DECIMAL(16, 4),
			taxableValue: DataTypes.DECIMAL(16, 4),
			total: DataTypes.DECIMAL(16, 4),
			otherAmountPerc: DataTypes.DECIMAL(16, 4),
			otherAmount: DataTypes.DECIMAL(16, 4)
		},
		{
			getterMethods: {
				name: function() {
					if (this.ItemMaster) {
						return this.ItemMaster.name;
					}
					return '';
				},
				managementTypeId: function() {
					if (this.ItemMaster) {
						return this.ItemMaster.managementTypeId;
					}
					return '';
				}
			}
		}
	);
	PurchaseOrderItem.associate = function(models) {
		// associations can be defined here
		PurchaseOrderItem.belongsTo(models.SalesOrder, {
			foreignKey: 'purchaseOrderId'
		});
		PurchaseOrderItem.belongsTo(models.ItemMaster, {
			foreignKey: 'itemMasterId'
		});
		PurchaseOrderItem.belongsTo(models.Warehouse, {
			foreignKey: 'warehouseId'
		});
		PurchaseOrderItem.belongsTo(models.UOM, {
			foreignKey: 'uomId'
		});
	};
	return PurchaseOrderItem;
};
