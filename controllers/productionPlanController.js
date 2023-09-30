const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const _ = require('lodash');
const moment = require('moment');
const paginate = require('express-paginate');

const db = require('../models/index');
const { getNextDocumentNumber, getConvertedQuantity } = require('../helpers/helper');
const { validateInputs } = require('../helpers/validate');
const status = require('../config/status');
const validationAttributes = require('../config/validation-attributes.json').productionPlan;

exports.getProductDetails = async (req, res, next) => {
	try {
		const { itemMasterId, warehouseId } = req.params;

		let finishedItem = {},
			semiFinishedItem = {},
			rawMaterial = {};

		//Fetch the Finished Item master
		const itemMaster = await db.ItemMaster
			.findOne({
				where: {
					id: itemMasterId
				},
				attributes: [ 'id', 'code', 'name', 'thickness', 'thicknessUomId' ],
				include: [
					{
						model: db.UOM,
						attributes: [ 'id', 'code', 'name' ],
						as: 'ThicknessUom'
					}
				]
			})
			.catch((e) => {
				throw e;
			});

		finishedItem.itemMaster = itemMaster;

		//Fetch the Finished Item stock
		const finishedItemStock = await db.WarehouseItems
			.findOne({
				where: {
					warehouseId,
					itemMasterId
				},
				attributes: [ 'onHand', 'price' ]
			})
			.catch((e) => {
				throw e;
			});

		// Convert the inventory stock to Pcs
		finishedItem.stock =
			finishedItemStock && finishedItemStock.onHand
				? await convertInventoryQtyToCustomUnit(itemMasterId, finishedItemStock.onHand, 'pcs')
				: 0;

		//Fetch the Finished Item master BOM with its default component
		const finishedItemBOM = await db.BillOfMaterials
			.findOne({
				where: {
					productId: itemMasterId
				},
				attributes: [],
				include: {
					model: db.BOMComponents,
					attributes: [ 'id', 'productId' ],
					where: {
						isDefault: true
					}
				}
			})
			.catch((e) => {
				throw e;
			});

		if (!finishedItemBOM) throw new Error('Bill of material not found for the finished good.');

		if (
			finishedItemBOM.BOMComponents.length &&
			finishedItemBOM.BOMComponents[0] &&
			finishedItemBOM.BOMComponents[0].productId
		) {
			const component = await db.ItemMaster.findOne({
				where: {
					id: finishedItemBOM.BOMComponents[0].productId
				},
				attributes: [ 'id', 'code', 'name', 'typeId' ]
			});

			// if Semi finished component
			if (component.typeId === 2) {
				semiFinishedItem.ItemMaster = component;

				const semiFinishedItemStock = await db.WarehouseItems
					.findOne({
						where: {
							warehouseId,
							itemMasterId: component.id
						},
						attributes: [ 'onHand', 'price' ]
					})
					.catch((e) => {
						throw e;
					});

				semiFinishedItem.stock =
					semiFinishedItemStock && semiFinishedItemStock.onHand
						? await convertInventoryQtyToCustomUnit(component.id, semiFinishedItemStock.onHand, 'MT')
						: 0;

				// Fetch the semi finished BOM
				const semiFinishedItemBOM = await db.BillOfMaterials
					.findOne({
						where: {
							productId: component.id
						},
						attributes: [],
						include: {
							model: db.BOMComponents,
							attributes: [ 'id', 'productId' ],
							where: {
								isDefault: true
							}
						}
					})
					.catch((e) => {
						throw e;
					});

				// If we have a  default component
				if (
					semiFinishedItemBOM &&
					semiFinishedItemBOM.BOMComponents.length &&
					semiFinishedItemBOM.BOMComponents[0] &&
					semiFinishedItemBOM.BOMComponents[0].productId
				) {
					const componentOfSemiFinished = await db.ItemMaster.findOne({
						where: {
							id: semiFinishedItemBOM.BOMComponents[0].productId
						},
						attributes: [ 'id', 'code', 'name', 'typeId' ]
					});

					// If its a raw material
					if (componentOfSemiFinished.typeId === 1) {
						rawMaterial.ItemMaster = componentOfSemiFinished;

						const rawMaterialStock = await db.WarehouseItems
							.findOne({
								where: {
									warehouseId,
									itemMasterId: componentOfSemiFinished.id
								},
								attributes: [ 'onHand', 'price' ]
							})
							.catch((e) => {
								throw e;
							});

						rawMaterial.stock =
							rawMaterialStock && rawMaterialStock.onHand
								? await convertInventoryQtyToCustomUnit(
										componentOfSemiFinished.id,
										rawMaterialStock.onHand,
										'MT'
									)
								: 0;
					}
				}
			} else if (component.typeId === 1) {
				// If raw material
				rawMaterial.ItemMaster = component;

				const rawMaterialStock = await db.WarehouseItems
					.findOne({
						where: {
							warehouseId,
							itemMasterId: component.id
						},
						attributes: [ 'onHand', 'price' ]
					})
					.catch((e) => {
						throw e;
					});

				rawMaterial.stock =
					rawMaterialStock && rawMaterialStock.onHand
						? await convertInventoryQtyToCustomUnit(component.id, rawMaterialStock.onHand, 'MT')
						: 0;
			}
		}

		const data = {
			finishedItem,
			semiFinishedItem,
			rawMaterial
		};

		return res.status(200).send({
			data,
			success: true,
			message: 'Success'
		});
	} catch (error) {
		console.log(error);
		return res.status(400).send({
			error,
			success: false,
			message: 'Action Failed'
		});
	}
};

exports.create = async (req, res, next) => {
	const { productionPlan } = req.body;
	const { ProductionPlanItems } = productionPlan;

	let transaction = await db.sequelize.transaction().catch((e) => {
		console.log(e);
		throw e;
	});

	try {
		if (req.headers.user) productionPlan.createdUser = req.headers.user;

		const nextDocNo = await getNextDocumentNumber('PRPL', productionPlan.series);

		if (nextDocNo) productionPlan.docNum = nextDocNo.nextNumber;

		productionPlan.status = 'open';

		let month = moment(productionPlan.docDate).month() + 1;
		let year = moment(productionPlan.docDate).year();
		let quarter = moment(productionPlan.docDate).quarter();

		productionPlan.month = month;
		productionPlan.year = year;
		productionPlan.quarter = quarter;

		const newProductionPlan = await db.ProductionPlan
			.create(productionPlan, {
				transaction
			})
			.catch((e) => {
				console.log(e);
				throw e;
			});

		await insertProductionPlanItems(ProductionPlanItems, newProductionPlan, req, transaction);

		await transaction.commit();

		return res.status(200).send({
			productionPlan: newProductionPlan,
			success: true,
			message: 'Success'
		});
	} catch (error) {
		// Rollback transaction only if the transaction object is defined
		if (transaction) await transaction.rollback();

		console.log(error);
		return res.status(400).send({
			success: false,
			message: 'Failed',
			error: error && error.message ? error.message : error
		});
	}
};

exports.validate = async (req, res, next) => {
	let { productionPlan } = req.body;

	const inputValidation = await validateInputs(productionPlan, validationAttributes);

	if (!inputValidation.success) {
		return res.status(401).send({
			success: false,
			message: inputValidation.message,
			error: inputValidation.errors
		});
	}
	next();
};

exports.list = async (req, res, next) => {
	var filter = [];
	var include = [
		{
			model: db.Branch,
			attributes: [ 'id', 'code', 'name' ]
		},
		{
			model: db.ProductionUnit,
			attributes: [ 'id', 'code', 'name' ]
		},
		{
			model: db.Warehouse,
			attributes: [ 'id', 'code', 'name' ]
		}
	];

	if (req.query.hasOwnProperty('all')) {
		return res.send({
			salesOrders: await db.ProductionPlan.findAll({
				include,
				where: {
					// statusId: {
					//     [Op.ne]: status.closed
					// }
				}
			})
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

	filter.push({});

	await db.ProductionPlan
		.findAndCountAll({
			include,
			distinct: true,
			limit: req.query.limit,
			offset: req.skip,
			where: filter,
			order: [ [ 'id', 'DESC' ] ]
		})
		.then(async (results) => {
			const itemCount = results.count;
			const pageCount = Math.ceil(results.count / req.query.limit);

			return res.send({
				productionPlans: results.rows,
				pageCount,
				itemCount,
				pages: paginate.getArrayPages(req)(3, pageCount, req.query.page)
			});
		})
		.catch((error) => {
			console.log(error);
			return res.status(400).send({
				error: error
			});
		});
};

exports.getOne = async (req, res, next) => {
	const { id } = req.params;

	let filter = [];
	let include = [
		{
			model: db.ProductionPlanItems,
			include: [
				{
					model: db.ItemMaster,
					attributes: [ 'id', 'code', 'name' ],
					as: 'FinishedItem'
				},
				{
					model: db.ItemMaster,
					attributes: [ 'id', 'code', 'name' ],
					as: 'SemiFinishedItem'
				},
				{
					model: db.ItemMaster,
					attributes: [ 'id', 'code', 'name' ],
					as: 'RawMaterial'
				},
				{
					model: db.RoutingStages,
					attributes: [ 'id', 'name' ]
				}
			]
		},
		{
			model: db.Branch,
			attributes: [ 'id', 'code', 'name' ]
		},
		{
			model: db.ProductionUnit,
			attributes: [ 'id', 'code', 'name' ]
		},
		{
			model: db.Warehouse,
			attributes: [ 'id', 'code', 'name' ]
		},
		{
			model: db.ProductionOrder,
			attributes: [ 'id', 'docNum', 'series' ],
			include: [
				{
					model: db.ItemMaster,
					attributes: [ 'id', 'code', 'name' ]
				}
			]
		}
	];

	filter.push({
		id
	});

	await db.ProductionPlan
		.findOne({
			include,
			where: filter
		})
		.then(async (result) => {
			if (!result) {
				return res.status(400).send({
					success: false,
					message: 'Record not found'
				});
			}

			return res.send({
				productionPlan: result,
				success: true,
				message: 'Success'
			});
		})
		.catch((error) => {
			console.log(error);
			return res.status(400).send({
				error,
				success: false,
				message: 'Action Failed'
			});
		});
};

exports.destroy = async (req, res, next) => {
	let transaction = await db.sequelize.transaction().catch((e) => {
		console.log(e);
		throw e;
	});

	try {
		const { id } = req.params;

		const productionPlan = await db.ProductionPlan
			.findOne({
				where: {
					id
				},
				transaction
			})
			.catch((error) => {
				console.log(error);
				throw error;
			});

		if (!productionPlan) {
			return res.status(404).send({
				message: 'record Not Found',
				success: false
			});
		}

		await productionPlan
			.destroy({
				transaction
			})
			.catch((error) => {
				throw error;
			});

		await db.ProductionOrder
			.destroy({
				where: {
					productionPlanId: id
				},
				transaction
			})
			.catch((error) => {
				throw error;
			});

		await transaction.commit();

		return res.status(204).send({
			message: 'Deleted Successfully.',
			success: true
		});
	} catch (error) {
		// Rollback transaction only if the transaction object is defined
		if (transaction) await transaction.rollback();

		console.log(error);
		return res.status(400).send({
			success: false,
			message: 'Failed',
			error: error && error.message ? error.message : error
		});
	}
};

const insertProductionPlanItems = async (productionPlanItems, productionPlan, req, transaction) => {
	console.log('########################## insertProductionPlanItems ##############################');
	for (let i = 0; i < productionPlanItems.length; i++) {
		const lineItem = productionPlanItems[i];
		lineItem.productionPlanId = productionPlan.id;

		await db.ProductionPlanItems
			.create(lineItem, {
				transaction
			})
			.catch((e) => {
				throw e;
			});

		const productionOrderParams = {
			productionPlanId: productionPlan.id,
			docDate: productionPlan.docDate,
			branchId: productionPlan.branchId,
			productionUnitId: productionPlan.productionUnitId,
			warehouseId: productionPlan.warehouseId,
			startDate: productionPlan.startingDate,
			remarks: productionPlan.remarks,
			productId: lineItem.itemMasterId,
			plannedQuantity: lineItem.productionQuantityInPcs,
			uomId: await getUOMId('pcs')
		};

		await createProductionOrder(req, productionOrderParams, lineItem, productionPlan, transaction);
	}
};

const createProductionOrder = async (req, headerParams, lineItem, productionPlan, transaction) => {
	console.log('########################## createProductionOrder ##############################');

	const productionOrder = {
		statusId: 8,
		...headerParams
	};

	if (req.headers.user) productionOrder.createdUser = req.headers.user;

	const nextDocNo = await getDocumentNumber(headerParams.productId, 'POR', transaction);

	if (nextDocNo) {
		productionOrder.docNum = nextDocNo.nextNumber;
		productionOrder.series = nextDocNo.series;
	}

	let month = moment(headerParams.docDate).month() + 1;
	let year = moment(headerParams.docDate).year();
	let quarter = moment(headerParams.docDate).quarter();

	productionOrder.month = month;
	productionOrder.year = year;
	productionOrder.quarter = quarter;

	const { unitCost, totalCost, bom } = await calculateCostsForProductionOrder(
		productionOrder.productId,
		productionOrder.plannedQuantity,
		transaction
	);

	productionOrder.unitCost = unitCost;
	productionOrder.totalCost = totalCost;

	console.log(nextDocNo);

	const newProductionOrder = await db.ProductionOrder
		.create(productionOrder, {
			transaction
		})
		.catch((e) => {
			console.log(e);
			throw e;
		});

	await insertProductionOrderItems(
		bom.BOMComponents,
		newProductionOrder.id,
		productionPlan,
		headerParams.plannedQuantity,
		transaction
	);

	await insertProductionOrderMachines(
		bom.BOMMachines,
		newProductionOrder.id,
		productionPlan.startingDate,
		lineItem.endDate,
		transaction
	);

	await insertProductionOrderLabours(
		bom.BOMLabours,
		newProductionOrder.id,
		productionPlan.startingDate,
		lineItem.endDate,
		transaction
	);
};

const getDocumentNumber = async (itemMasterId, type, transaction) => {
	const itemMaster = await db.ItemMaster
		.findOne({
			where: {
				id: itemMasterId
			},
			attributes: [ 'warehouseId' ],
			transaction
		})
		.catch((e) => {
			throw e;
		});

	let series = null;

	switch (itemMaster.warehouseId) {
		case 20:
			series = 'BRST12';
			break;

		case 21:
			series = 'BRST15';
			break;

		case 22:
			series = 'BRST38';
			break;

		case 27:
			series = 'AAT-12';
			break;

		case 28:
			series = 'AAT-950';
			break;

		default:
			break;
	}

	return await getNextDocumentNumber(type, series);
};

// const insertProductionOrderItems = async (
// 	lineItem,
// 	productionOrderId,
// 	productionPlan,
// 	bom,
// 	plannedQuantity,
// 	transaction
// ) => {
// 	console.log('########################## insertProductionOrderItems ##############################');

// 	if (!lineItem.semiFinishedItemId && !lineItem.rawMaterialId)
// 		throw new Error('Semi Finished Item and Raw material is not provided');

// 	const componentId = lineItem.semiFinishedItemId || lineItem.rawMaterialId;

// 	const bomComponent = await db.BOMComponents
// 		.findOne({
// 			where: {
// 				bomId: bom.id,
// 				productId: componentId
// 			},
// 			attributes: [ 'quantityPerUnit', 'cost' ]
// 		})
// 		.catch((e) => {
// 			throw e;
// 		});

// 	const totalQuantity = +plannedQuantity * +bomComponent.quantityPerUnit;
// 	const param = {
// 		productionOrderId,
// 		productId: componentId,
// 		warehouseId: productionPlan.warehouseId,
// 		totalQuantity,
// 		unitCost: bom.totalCostInBaseUnit, //bomComponent.cost,
// 		uomId: await getUOMId('MT'),
// 		quantityPerUnit: bomComponent.quantityPerUnit,
// 		totalCost: parseFloat(+bom.totalCostInBaseUnit * totalQuantity).toFixed(4)
// 	};

// 	await db.ProductionOrderComponents
// 		.create(param, {
// 			transaction
// 		})
// 		.catch((e) => {
// 			throw e;
// 		});
// };

const insertProductionOrderItems = async (
	components,
	productionOrderId,
	productionPlan,
	plannedQuantity,
	transaction
) => {
	console.log('###########################insertProductionOrderItems###############################');

	for (let i = 0; i < components.length; i++) {
		const component = components[i];
		const totalQuantity = +plannedQuantity * +component.quantityPerUnit;

		var inputParams = {
			productionOrderId,
			productId: component.productId,
			warehouseId: productionPlan.warehouseId,
			totalQuantity,
			unitCost: component.totalCost,
			uomId: component.uomId,
			quantityPerUnit: component.quantityPerUnit,
			totalCost: parseFloat(+component.totalCost * totalQuantity).toFixed(4)
		};

		await db.ProductionOrderComponents
			.create(inputParams, {
				transaction
			})
			.catch((e) => {
				console.log(e);
				throw e;
			});
	}
};

const insertProductionOrderMachines = async (machines, productionOrderId, startDate, endDate, transaction) => {
	console.log('###########################insertProductionOrderMachines###############################');

	for (let i = 0; i < machines.length; i++) {
		const machine = machines[i];
		var inputParams = {
			machineId: machine.machineId,
			estimatedTime: machine.estimatedTime,
			costPerHour: machine.cost,
			totalCost: machine.totalCost,
			totalTime: machine.estimatedTime,
			routingStageNumber: machine.routingStageNumber,
			routingStageId: machine.routingStageId,
			hoursInBaseUnit: machine.hoursInBaseUnit,
			costInBaseUnit: machine.costInBaseUnit,
			// employeeId: item.employeeId,
			noOfLabours: parseInt(machine.noOfLabours),
			startDate,
			endDate
		};

		inputParams.productionOrderId = productionOrderId;

		await db.ProductionOrderMachines
			.create(inputParams, {
				transaction
			})
			.catch((e) => {
				console.log(e);
				throw e;
			});
	}
};

const insertProductionOrderLabours = async (labours, productionOrderId, startDate, endDate, transaction) => {
	console.log('########################## insertProductionOrderLabours ##############################');

	for (let i = 0; i < labours.length; i++) {
		const labour = labours[i];

		if (!labour.employeeId) continue;

		var inputParams = {
			employeeId: labour.employeeId,
			estimatedTime: labour.estimatedTime,
			costPerHour: labour.cost,
			totalCost: labour.totalCost,
			totalTime: labour.estimatedTime,
			hoursInBaseUnit: labour.hoursInBaseUnit,
			costInBaseUnit: labour.costInBaseUnit,
			startDate,
			endDate
		};

		inputParams.productionOrderId = productionOrderId;

		await db.ProductionOrderLabours
			.create(inputParams, {
				transaction
			})
			.catch((e) => {
				console.log(e);
				throw e;
			});
	}
};

const calculateCostsForProductionOrder = async (productId, plannedQuantity, transaction) => {
	console.log('##########################calculateCostsForProductionOrder####################################');
	const bom = await db.BillOfMaterials
		.findOne({
			where: {
				productId
			},
			include: [
				{
					model: db.BOMComponents
					// where: {
					// 	isDefault: true
					// }
				},
				{
					model: db.BOMMachines
				},
				{
					model: db.BOMLabours
				}
			],
			transaction
		})
		.catch((e) => {
			throw e;
		});

	let unitCost = 0;

	if (bom && bom.BOMComponents && bom.BOMComponents.length) {
		const totalComponentCost = bom.BOMComponents.reduce((total, item) => total + +item.totalCost, 0);

		unitCost += +totalComponentCost;
	}

	// if (bom && bom.BOMComponents && bom.BOMComponents.length && bom.BOMComponents[0]) {
	// 	const bomComponent = bom.BOMComponents[0];
	// 	semiFinishedItemCost = bom.BOMComponents[0].totalCost; // bom.totalCostInBaseUnit;

	// 	const totalQuantity = +plannedQuantity * +bomComponent.quantityPerUnit;

	// 	const totalComponentCost = parseFloat(+semiFinishedItemCost * +totalQuantity).toFixed(4);

	// 	totalCost += +totalComponentCost;
	// }

	if (bom && bom.BOMMachines && bom.BOMMachines.length) {
		const totalMachineCost = bom.BOMMachines.reduce((total, item) => total + +item.totalCost, 0);

		unitCost += +totalMachineCost;
	}

	if (bom && bom.BOMLabours && bom.BOMLabours.length) {
		const totalLabourCost = bom.BOMLabours.reduce((total, item) => total + +item.totalCost, 0);

		unitCost += +totalLabourCost;
	}

	const totalCost = parseFloat(+unitCost * +plannedQuantity).toFixed(4);

	return {
		unitCost,
		totalCost,
		bom
	};
};

const convertInventoryQtyToCustomUnit = async (itemMasterId, quantity, unitCode) => {
	console.log('################################# convertInventoryQtyToCustomUnit #######################');

	const itemMaster = await db.ItemMaster
		.findOne({
			where: {
				id: itemMasterId
			},
			attributes: [ 'inventoryUOMId', 'name' ]
		})
		.catch((error) => {
			console.log(error);
			throw error;
		});

	const uom = await db.UOM
		.findOne({
			where: {
				code: unitCode
			}
		})
		.catch((error) => {
			throw error;
		});

	if (uom.id === itemMaster.inventoryUOMId) return quantity;

	const itemMasterUOM = await db.ItemMasterUOMs
		.findOne({
			where: {
				itemMasterId,
				uomId: uom.id
			}
		})
		.catch((error) => {
			console.log(error);
			throw error;
		});

	if (!itemMasterUOM)
		throw new Error(
			`${uom.name} is not associated with ${itemMaster.name}! Please add it in the item master under inventory.`
		);

	let conversionFactor =
		itemMasterUOM.conversionFactor && itemMasterUOM.conversionFactor > 0 ? itemMasterUOM.conversionFactor : 1;

	return parseFloat(+quantity * +conversionFactor).toFixed(4);
};

const getUOMId = async (code) => {
	const uom = await db.UOM.findOne({
		where: {
			code
		}
	});

	if (uom) return uom.id;

	return null;
};

exports.convertPiecesToMT = async (req, res) => {
	try {
		const { quantity, itemMasterId } = req.params;

		const uomPiece = await db.UOM
			.findOne({
				where: {
					code: 'pcs'
				}
			})
			.catch((error) => {
				throw error;
			});

		const qtyInInventoryUOM = await getConvertedQuantity(uomPiece.id, itemMasterId, quantity);

		const qtyInMT = await convertInventoryQtyToCustomUnit(itemMasterId, qtyInInventoryUOM, 'MT');

		return res.status(200).send({
			qtyInMT,
			success: true,
			message: 'Success'
		});
	} catch (error) {
		console.log(error);
		return res.status(400).send({
			error: error && error.message ? error.message : error,
			success: false,
			message: error && error.message ? error.message : 'Action Failed'
		});
	}
};
