const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require('../models/index');
const BillOfMaterial = require('../models').BillOfMaterials;
const BOMMachine = require('../models').BOMMachines;
const BOMLabour = require('../models').BOMLabours;
const BOMComponent = require('../models').BOMComponents;
const BOMRoutingStage = require('../models').BOMRoutingStages;
const RoutingStages = require('../models').RoutingStages;
const ItemMaster = require('../models').ItemMaster;
const ItemMasterUOMs = require('../models').ItemMasterUOMs;
const Employee = require('../models').Employee;
const MachineCenter = require('../models').MachineCenter;
const ProductionUnit = require('../models').ProductionUnit;
const Warehouse = require('../models').Warehouse;
const UOM = require('../models').UOM;
const _ = require('lodash');
const paginate = require('express-paginate');
const helper = require('../helpers/helper');

exports.list = async (req, res, next) => {
	var filter = [];
	var include = [
		{
			model: BOMMachine,
			include: [
				{
					model: MachineCenter
				},
				{
					model: RoutingStages
				}
			]
		},
		{
			model: BOMLabour,
			include: [
				{
					model: Employee
				}
			]
		},
		{
			model: BOMComponent,
			include: [
				{
					model: ItemMaster
				},
				{
					model: Warehouse
				},
				{
					model: UOM
				}
			]
		},
		{
			model: BOMRoutingStage
		},
		{
			model: UOM
		}
	];

	let itemMasterFilter = [];

	if (req.query.itemMaster) {
		itemMasterFilter.push({
			name: {
				[Op.iLike]: `%${req.query.itemMaster}%`
			}
		});
	}

	if (req.query.itemMasterCode) {
		itemMasterFilter.push({
			code: {
				[Op.iLike]: `%${req.query.itemMasterCode}%`
			}
		});
	}

	include.push({
		model: ItemMaster,
		where: itemMasterFilter
	});

	if (req.query.productionUnit) {
		include.push({
			model: ProductionUnit,
			where: {
				name: {
					[Op.iLike]: `%${req.query.productionUnit}%`
				}
			}
		});
	} else {
		include.push({
			model: ProductionUnit
		});
	}

	if (req.query.filtered != undefined) {
		req.query.filtered = JSON.stringify(req.query.filtered);

		var filtered = JSON.parse(req.query.filtered);
		for (var i = 0; i < filtered.length; i++) {
			filtered[i] = JSON.parse(filtered[i]);
		}

		filter = filtered.map((data) => {
			if (data.param == 'statusId') {
				return {
					[data.param]: {
						[Op.eq]: data.value
					}
				};
			} else {
				return {
					[data.param]: {
						[Op.iLike]: `${data.value}%`
					}
				};
			}
		});
	}

	let whereCondition = {};
	if (filter.length > 0) {
		whereCondition = {
			[Op.and]: filter,
			deleted: {
				[Op.eq]: false
			}
		};
	} else {
		whereCondition = {
			deleted: {
				[Op.eq]: false
			}
		};
	}

	await BillOfMaterial.findAndCountAll({
		include: include,
		distinct: true,
		limit: req.query.limit,
		offset: req.skip,
		where: whereCondition,
		order: [ [ 'id', 'DESC' ] ]
	})
		.then(async (results) => {
			const itemCount = results.count;
			const pageCount = Math.ceil(results.count / req.query.limit);

			return res.send({
				billOfMaterials: results.rows,
				pageCount,
				itemCount,
				pages: paginate.getArrayPages(req)(3, pageCount, req.query.page)
			});
		})
		.catch((error) => {
			console.error(error);
			return res.status(400).send({
				error
			});
		});
};

exports.create = async (req, res, next) => {
	let { billOfMaterial } = req.body;

	const { BOMComponents } = billOfMaterial;

	const { BOMMachines } = billOfMaterial;

	const { BOMLabours } = billOfMaterial;

	var include = [
		{
			model: BOMComponent,
			required: true
		},
		{
			model: BOMMachine,
			required: true
		},
		{
			model: BOMLabour,
			required: true
		},
		{
			model: BOMRoutingStage,
			required: true
		}
	];

	const existingBillOfMaterial = await BillOfMaterial.findOne({
		where: {
			productId: {
				[Op.eq]: billOfMaterial.productId
			},
			deleted: {
				[Op.eq]: false
			}
		}
	});

	if (existingBillOfMaterial && existingBillOfMaterial.id)
		return res.status(422).send({
			success: false,
			message: 'Bill of Material already exist for the product'
		});

	let transaction;

	try {
		transaction = await db.sequelize.transaction().catch((e) => {
			console.log(e);
			throw e;
		});

		billOfMaterial.totalCostInBaseUnit = await helper.getConvertedPrice(
			billOfMaterial.uomId,
			billOfMaterial.productId,
			billOfMaterial.totalCost
		);

		const newBillOfMaterial = await BillOfMaterial.create(billOfMaterial, {
			// include: include,
			transaction: transaction
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		if (newBillOfMaterial && newBillOfMaterial.id) {
			let itemMaster = await ItemMaster.findOne({
				where: {
					id: newBillOfMaterial.productId
				}
			}).catch((error) => {
				console.log(error);
				throw error;
			});

			await insertBOMComponents(BOMComponents, newBillOfMaterial, itemMaster, transaction);
			await insertBOMMachines(BOMMachines, newBillOfMaterial, itemMaster, transaction);
			await insertBOMLabours(BOMLabours, newBillOfMaterial, itemMaster, transaction);
			// await insertBOMRoutingStages(BOMRoutingStages, billOfMaterialId, transaction)

			// commit
			await transaction.commit();

			return res.status(200).send({
				newBillOfMaterial,
				success: true,
				message: 'Success'
			});
		} else throw Error('Insertion failed.');
	} catch (err) {
		// Rollback transaction only if the transaction object is defined
		if (transaction) await transaction.rollback();
		console.log(err);
		return res.status(400).send({
			success: false,
			message: 'Failed',
			error: err
		});
	}
};

exports.update = async (req, res, next) => {
	let { billOfMaterial } = req.body;

	const { BOMComponents } = billOfMaterial;

	const { BOMMachines } = billOfMaterial;

	const { BOMLabours } = billOfMaterial;

	const { BOMRoutingStages } = billOfMaterial;

	const billOfMaterialId = req.params.id;

	let transaction = await db.sequelize.transaction().catch((e) => {
		console.log(e);
		throw e;
	});

	try {
		const existingBillOfMaterial = await BillOfMaterial.findOne({
			where: {
				id: billOfMaterialId
			}
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		billOfMaterial.totalCostInBaseUnit = await helper.getConvertedPrice(
			billOfMaterial.uomId,
			billOfMaterial.productId,
			billOfMaterial.totalCost
		);

		await existingBillOfMaterial
			.update(billOfMaterial, {
				transaction
			})
			.catch((e) => {
				console.log(e);
				throw e;
			});

		if (existingBillOfMaterial && existingBillOfMaterial.id) {
			let itemMaster = await ItemMaster.findOne({
				where: {
					id: existingBillOfMaterial.productId
				}
			}).catch((error) => {
				console.log(error);
				throw error;
			});

			await insertBOMComponents(BOMComponents, existingBillOfMaterial, itemMaster, transaction);
			await insertBOMMachines(BOMMachines, existingBillOfMaterial, itemMaster, transaction);
			await insertBOMLabours(BOMLabours, existingBillOfMaterial, itemMaster, transaction);

			// await insertBOMRoutingStages(BOMRoutingStages, billOfMaterialId, transaction)

			// commit
			await transaction.commit();

			return res.status(200).send({
				existingBillOfMaterial,
				success: true,
				message: 'Success'
			});
		} else {
			throw 'Bill of Materials does not exist.';
		}
	} catch (err) {
		// Rollback transaction only if the transaction object is defined
		if (transaction) await transaction.rollback();
		console.log(err);
		return res.status(400).send({
			success: false,
			message: 'Failed',
			error: err
		});
	}
};

const insertBOMComponents = async (bomComponents, bom, itemMaster, transaction) => {
	console.log('#################################insertBOMComponents#############################');
	let bomId = bom.id;

	const existingComponents = await BOMComponent.findAll({
		where: {
			bomId: bomId
		}
	}).catch((error) => {
		console.log(error);
		throw error;
	});

	const componentIds = bomComponents.map((x) => x.id);
	const componentsToDelete = existingComponents.filter((x) => !componentIds.includes(x.id));

	// Delete the items which is removed by user
	for (component of componentsToDelete) {
		await component
			.destroy({
				transaction
			})
			.catch((error) => {
				console.log(error);
				throw error;
			});
	}

	for (let i = 0; i < bomComponents.length; i++) {
		const item = bomComponents[i];
		let quantityInBaseUnit = (+item.estimatedQuantity / bom.averageProductionQuantity).toFixed(4),
			costInBaseUnit = (+item.cost / bom.averageProductionQuantity).toFixed(4);

		var inputParams = {
			productId: item.productId,
			warehouseId: item.warehouseId,
			estimatedQuantity: item.estimatedQuantity,
			quantityPerUnit: item.quantityPerUnit,
			quantityInBaseUnit: quantityInBaseUnit,
			costInBaseUnit: costInBaseUnit,
			uomId: item.uomId,
			cost: item.cost,
			remarks: item.remarks,
			totalCost: item.totalCost,
			isDefault: item.isDefault
		};

		if (itemMaster.inventoryUOMId != bom.uomId) {
			let itemMasterUOM = await ItemMasterUOMs.findOne({
				where: {
					itemMasterId: bom.productId,
					uomId: bom.uomId
				}
			}).catch((error) => {
				console.log(error);
				throw error;
			});

			if (itemMasterUOM && itemMasterUOM) {
				let conversionFactor = itemMasterUOM.conversionFactor;
				quantityInBaseUnit = (quantityInBaseUnit / conversionFactor).toFixed(4);

				inputParams.quantityInBaseUnit = quantityInBaseUnit;

				if (item.cost && item.cost > 0) {
					costInBaseUnit = (costInBaseUnit / conversionFactor).toFixed(4);
					inputParams.costInBaseUnit = costInBaseUnit;
				}
			}
		}

		if (item.id) {
			const componentObj = await BOMComponent.findOne({
				where: {
					id: item.id
				}
			}).catch((error) => {
				console.log(error);
				throw error;
			});

			if (componentObj)
				await componentObj
					.update(inputParams, {
						transaction
					})
					.catch((error) => {
						console.log(error);
						throw error;
					});
		} else {
			inputParams.bomId = bomId;

			await BOMComponent.create(inputParams, {
				transaction
			}).catch((e) => {
				console.log(e);
				throw e;
			});
		}
	}
};

const insertBOMMachines = async (bomMachines, bom, itemMaster, transaction) => {
	let bomId = bom.id;

	const existingMachines = await BOMMachine.findAll({
		where: {
			bomId: bomId
		}
	}).catch((error) => {
		console.log(error);
		throw error;
	});

	const machineIds = bomMachines.map((x) => x.id);
	const machinesToDelete = existingMachines.filter((x) => !machineIds.includes(x.id));

	// Delete the items which is removed by user
	for (machine of machinesToDelete) {
		await machine
			.destroy({
				transaction
			})
			.catch((error) => {
				console.log(error);
				throw error;
			});
	}

	for (let i = 0; i < bomMachines.length; i++) {
		const item = bomMachines[i];
		let hoursInBaseUnit = (+item.estimatedTime / bom.averageProductionQuantity).toFixed(4),
			costInBaseUnit = (+item.cost / bom.averageProductionQuantity).toFixed(4),
			hoursPerUnit = (+item.estimatedTime / bom.averageProductionQuantity).toFixed(4);

		var inputParams = {
			machineId: item.machineId,
			estimatedTime: item.estimatedTime,
			hoursPerUnit: hoursPerUnit,
			hoursInBaseUnit: hoursInBaseUnit,
			cost: item.cost,
			costInBaseUnit: costInBaseUnit,
			remarks: item.remarks,
			routingStageNumber: item.routingStageNumber,
			routingStageId: item.routingStageId,
			noOfLabours: item.noOfLabours,
			totalCost: item.totalCost
		};

		if (itemMaster.inventoryUOMId != bom.uomId) {
			let itemMasterUOM = await ItemMasterUOMs.findOne({
				where: {
					itemMasterId: bom.productId,
					uomId: bom.uomId
				}
			}).catch((error) => {
				console.log(error);
				throw error;
			});

			if (itemMasterUOM && itemMasterUOM) {
				let conversionFactor = itemMasterUOM.conversionFactor;

				hoursInBaseUnit = (hoursInBaseUnit / conversionFactor).toFixed(4);

				inputParams.hoursInBaseUnit = hoursInBaseUnit;

				if (item.cost && item.cost > 0) {
					costInBaseUnit = (item.cost / conversionFactor).toFixed(4);
					inputParams.costInBaseUnit = costInBaseUnit;
				}
			}
		}

		if (item.id) {
			const machineObj = await BOMMachine.findOne({
				where: {
					id: item.id
				}
			}).catch((error) => {
				console.log(error);
				throw error;
			});

			if (machineObj)
				await machineObj
					.update(inputParams, {
						transaction
					})
					.catch((error) => {
						console.log(error);
						throw error;
					});
		} else {
			inputParams.bomId = bomId;

			await BOMMachine.create(inputParams, {
				transaction
			}).catch((e) => {
				console.log(e);
				throw e;
			});
		}
	}
};

const insertBOMLabours = async (bomLabours, bom, itemMaster, transaction) => {
	let bomId = bom.id;

	const existingLabours = await BOMLabour.findAll({
		where: {
			bomId: bomId
		}
	}).catch((error) => {
		console.log(error);
		throw error;
	});

	const labourIds = bomLabours.map((x) => x.id);
	const laboursToDelete = existingLabours.filter((x) => !labourIds.includes(x.id));

	// Delete the items which is removed by user
	for (labour of laboursToDelete) {
		await labour
			.destroy({
				transaction
			})
			.catch((error) => {
				console.log(error);
				throw error;
			});
	}

	for (let i = 0; i < bomLabours.length; i++) {
		const item = bomLabours[i];

		if (!item.employeeId || !item.estimatedTime) continue;

		let hoursInBaseUnit = (+item.estimatedTime / bom.averageProductionQuantity).toFixed(4),
			costInBaseUnit = (+item.cost / bom.averageProductionQuantity).toFixed(4),
			hoursPerUnit = (+item.estimatedTime / bom.averageProductionQuantity).toFixed(4);

		var inputParams = {
			employeeId: item.employeeId,
			estimatedTime: item.estimatedTime,
			hoursPerUnit: hoursPerUnit,
			hoursInBaseUnit: hoursInBaseUnit,
			cost: item.cost,
			costInBaseUnit: costInBaseUnit,
			remarks: item.remarks,
			totalCost: item.totalCost
		};

		if (itemMaster.inventoryUOMId != bom.uomId) {
			let itemMasterUOM = await ItemMasterUOMs.findOne({
				where: {
					itemMasterId: bom.productId,
					uomId: bom.uomId
				}
			}).catch((error) => {
				console.log(error);
				throw error;
			});

			if (itemMasterUOM && itemMasterUOM) {
				let conversionFactor = itemMasterUOM.conversionFactor;

				hoursInBaseUnit = (hoursInBaseUnit / conversionFactor).toFixed(4);

				inputParams.hoursInBaseUnit = hoursInBaseUnit;

				if (item.cost && item.cost > 0) {
					costInBaseUnit = (costInBaseUnit / conversionFactor).toFixed(4);
					inputParams.costInBaseUnit = costInBaseUnit;
				}
			}
		}

		if (item.id) {
			const labourObj = await BOMLabour.findOne({
				where: {
					id: item.id
				}
			}).catch((error) => {
				console.log(error);
				throw error;
			});

			if (labourObj)
				await labourObj
					.update(inputParams, {
						transaction
					})
					.catch((error) => {
						console.log(error);
						throw error;
					});
		} else {
			inputParams.bomId = bomId;

			await BOMLabour.create(inputParams, {
				transaction
			}).catch((e) => {
				console.log(e);
				throw e;
			});
		}
	}
};

const insertBOMRoutingStages = async (bomRoutingStages, bomId, transaction) => {
	for (let i = 0; i < bomRoutingStages.length; i++) {
		const item = bomRoutingStages[i];
		var inputParams = {
			code: item.code,
			name: item.name
		};

		if (item.id) {
			const routingStageObj = await BOMRoutingStage.findOne({
				where: {
					id: item.id
				}
			}).catch((error) => {
				console.log(error);
				throw error;
			});

			if (routingStageObj)
				await routingStageObj
					.update(inputParams, {
						transaction
					})
					.catch((error) => {
						console.log(error);
						throw error;
					});
		} else {
			inputParams.bomId = bomId;

			await BOMRoutingStage.create(inputParams, {
				transaction
			}).catch((e) => {
				console.log(e);
				throw e;
			});
		}
	}
};

exports.getOne = async (req, res, next) => {
	const { id } = req.params;

	var include = [
		{
			model: BOMMachine,
			include: [
				{
					model: MachineCenter
				}
			]
		},
		{
			model: BOMLabour,
			include: [
				{
					model: Employee
				}
			]
		},
		{
			model: BOMComponent,
			include: [
				{
					model: ItemMaster
				},
				{
					model: Warehouse
				},
				{
					model: UOM
				}
			]
		},
		{
			model: ItemMaster
		},
		{
			model: BOMRoutingStage
		},
		{
			model: ProductionUnit
		},
		{
			model: UOM
		}
	];

	await BillOfMaterial.findOne({
		where: {
			id: {
				[Op.eq]: id
			},
			deleted: {
				[Op.eq]: false
			}
		},
		include: include
	})
		.then((result) => {
			if (!result) {
				return res.status(404).send({
					message: 'record Not Found',
					success: false
				});
			}
			return res.status(200).send({
				billOfMaterial: result,
				success: true,
				message: 'Success'
			});
		})
		.catch((error) =>
			res.status(400).send({
				error,
				success: false,
				message: 'Failed'
			})
		);
};

exports.destroy = async (req, res, next) => {
	const { id } = req.params;

	const bom = await BillOfMaterial.findOne({
		where: {
			id: id
		}
	}).catch((error) => {
		console.log(error);
		throw error;
	});

	if (!bom) {
		return res.status(404).send({
			message: 'record Not Found',
			success: false
		});
	}

	await bom
		.update({
			deleted: true
		})
		.catch((error) => {
			console.log(error);
			throw error;
		});

	return res.status(204).send({
		message: 'Deleted Successfully.',
		success: true
	});
};

exports.getOneBasedOnProduct = async (req, res, next) => {
	const { productId } = req.params;

	var include = [
		{
			model: BOMComponent
		},
		{
			model: BOMMachine
		},
		{
			model: BOMLabour
		}
	];

	await BillOfMaterial.findOne({
		where: {
			productId: {
				[Op.eq]: productId
			},
			deleted: {
				[Op.eq]: false
			}
		},
		include: include
	})
		.then((result) => {
			if (!result) {
				return res.status(404).send({
					message: `Bill of Material not found.`,
					success: false
				});
			}
			return res.status(200).send({
				billOfMaterial: result,
				success: true,
				message: 'Success'
			});
		})
		.catch((error) =>
			res.status(400).send({
				error,
				success: false,
				message: 'Failed'
			})
		);
};

exports.getProductCost = async (req, res, next) => {
	try {
		const { itemMasterId, uomId } = req.params;

		const bom = await BillOfMaterial.findOne({
			where: {
				productId: itemMasterId,
				deleted: false
			},
			attributes: [ 'id', 'totalCost', 'totalCostInBaseUnit' ]
		}).catch((error) => {
			throw error;
		});

		if (!bom) {
			throw new Error('Bill of Material not found!');
		}

		const cost = await helper.getConvertedPrice(uomId, itemMasterId, bom.totalCostInBaseUnit);

		return res.status(200).send({
			cost,
			success: true,
			message: 'Success'
		});
	} catch (error) {
		console.error(error);
		res.status(400).send({
			error,
			success: false,
			message: 'Failed'
		});
	}
};
