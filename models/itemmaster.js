'use strict';
module.exports = (sequelize, DataTypes) => {
	const ItemMaster = sequelize.define(
		'ItemMaster',
		{
			code: {
				type: DataTypes.STRING,
				validate: {
					notEmpty: {
						args: true,
						msg: 'Code field should not be empty'
					}
				},
				unique: true
			},
			name: {
				type: DataTypes.STRING,
				validate: {
					notEmpty: {
						args: true,
						msg: 'Name field should not be empty'
					}
				},
				unique: true
			},
			hierarchyCode: DataTypes.STRING,
			barcode: DataTypes.STRING,
			ordered: DataTypes.DECIMAL(16, 4),
			committed: DataTypes.DECIMAL(16, 4),
			inventoryUOMId: DataTypes.INTEGER,
			purchaseUOMId: DataTypes.INTEGER,
			salesUOMId: DataTypes.INTEGER,
			categoryId: DataTypes.INTEGER,
			departmentId: DataTypes.INTEGER,
			brandId: DataTypes.INTEGER,
			warehouseId: DataTypes.INTEGER,
			valuationMethod: DataTypes.STRING,
			length: DataTypes.DECIMAL(16, 4),
			width: DataTypes.DECIMAL(16, 4),
			height: DataTypes.DECIMAL(16, 4),
			weight: DataTypes.DECIMAL(16, 4),
			thickness: DataTypes.DECIMAL(16, 4),
			density: DataTypes.DECIMAL(16, 2),
			lengthUomId: DataTypes.INTEGER,
			widthUomId: DataTypes.INTEGER,
			heightUomId: DataTypes.INTEGER,
			weightUomId: DataTypes.INTEGER,
			thicknessUomId: DataTypes.INTEGER,
			densityUomId: DataTypes.INTEGER,
			typeId: DataTypes.INTEGER,
			seriallyNumbered: DataTypes.BOOLEAN,
			statusId: DataTypes.INTEGER,
			remarks: DataTypes.STRING,
			latestBarcode: DataTypes.STRING,
			consumptionTypeId: DataTypes.INTEGER,
			managementTypeId: DataTypes.INTEGER,
			productionUnitId: DataTypes.INTEGER,
			deletedAt: DataTypes.DATE,
			makeBuy: DataTypes.STRING,
			minimumStock: DataTypes.INTEGER,
			maximumStock: DataTypes.INTEGER,
			bundleString1: DataTypes.STRING,
			bundleString2: DataTypes.STRING,
			bundleInitialNumber: DataTypes.INTEGER,
			bundleNextNumber: DataTypes.INTEGER,
			materialId: DataTypes.INTEGER
		},
		{
			getterMethods: {},
			hooks: {}
		}
	);
	ItemMaster.associate = function(models) {
		// associations can be defined here
		ItemMaster.belongsTo(models.UOM, {
			foreignKey: 'inventoryUOMId',
			as: 'InventoryUOM'
		});
		ItemMaster.belongsTo(models.UOM, {
			foreignKey: 'purchaseUOMId',
			as: 'PurchaseUOM'
		});
		ItemMaster.belongsTo(models.UOM, {
			foreignKey: 'salesUOMId',
			as: 'SalesUOM'
		});
		ItemMaster.belongsTo(models.ItemCategory, {
			foreignKey: 'categoryId',
			as: 'Category'
		});
		ItemMaster.belongsTo(models.Department, {
			foreignKey: 'departmentId',
			as: 'Department'
		});
		ItemMaster.belongsTo(models.Brand, {
			foreignKey: 'brandId',
			as: 'Brand'
		});
		ItemMaster.belongsTo(models.Warehouse, {
			foreignKey: 'warehouseId',
			as: 'Warehouse'
		});
		ItemMaster.hasMany(models.WarehouseItems, {
			foreignKey: 'itemMasterId',
			as: 'WarehouseItems'
		});
		ItemMaster.hasMany(models.ItemMasterAttribute, {
			foreignKey: 'itemMasterId'
		});
		ItemMaster.hasMany(models.ItemMasterUOMs, {
			foreignKey: 'itemMasterId'
		});
		ItemMaster.belongsTo(models.Status, {
			foreignKey: 'statusId',
			as: 'status'
		});
		ItemMaster.belongsTo(models.UOM, {
			foreignKey: 'lengthUomId',
			as: 'LengthUOM'
		});
		ItemMaster.belongsTo(models.UOM, {
			foreignKey: 'widthUomId',
			as: 'WidthUOM'
		});
		ItemMaster.belongsTo(models.UOM, {
			foreignKey: 'heightUomId',
			as: 'HeightUOM'
		});
		ItemMaster.belongsTo(models.UOM, {
			foreignKey: 'weightUomId',
			as: 'WeightUOM'
		});
		ItemMaster.belongsTo(models.UOM, {
			foreignKey: 'thicknessUomId',
			as: 'ThicknessUom'
		});
		ItemMaster.belongsTo(models.UOM, {
			foreignKey: 'densityUomId',
			as: 'DensityUom'
		});
		ItemMaster.hasMany(models.OIVL, {
			foreignKey: 'itemMasterId'
		});
		ItemMaster.hasMany(models.OIVLBarcodes, {
			foreignKey: 'itemMasterId'
		});
		ItemMaster.belongsTo(models.ConsumptionType, {
			foreignKey: 'consumptionTypeId'
		});
		ItemMaster.belongsTo(models.ItemManagementType, {
			foreignKey: 'managementTypeId'
		});
		ItemMaster.belongsTo(models.ProductionUnit, {
			foreignKey: 'productionUnitId'
		});
		ItemMaster.hasMany(models.ProductionOrder, {
			foreignKey: 'productId'
		});
		ItemMaster.hasOne(models.BillOfMaterials, {
			foreignKey: 'productId'
		});
		ItemMaster.belongsTo(models.Material, {
			foreignKey: 'materialId'
		});
	};
	return ItemMaster;
};
