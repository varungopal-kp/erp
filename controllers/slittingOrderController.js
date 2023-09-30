const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const _ = require('lodash');
const moment = require('moment');
const paginate = require('express-paginate');

const db = require('../models/index');
const { getNextDocumentNumber } = require('../helpers/helper');
const { validateInputs } = require('../helpers/validate');
const status = require('../config/status');
const validationAttributes = require('../config/validation-attributes.json').slittingOrder;

exports.create = async (req, res, next) => {
	const { slittingOrder } = req.body;
	const { SlittingOrderItems, SlittingOrderMachines, SlittingOrderLabours } = slittingOrder;

	let transaction = await db.sequelize.transaction().catch((e) => {
		console.log(e);
		throw e;
	});

	try {
		if (req.headers.user) slittingOrder.createdUser = req.headers.user;

		const nextDocNo = await getNextDocumentNumber('SLOR', slittingOrder.series);

		if (nextDocNo) slittingOrder.docNum = nextDocNo.nextNumber;

		slittingOrder.status = 'open';

		let month = moment(slittingOrder.docDate).month() + 1;
		let year = moment(slittingOrder.docDate).year();
		let quarter = moment(slittingOrder.docDate).quarter();

		slittingOrder.month = month;
		slittingOrder.year = year;
		slittingOrder.quarter = quarter;

		const newSlittingOrder = await db.SlittingOrder
			.create(slittingOrder, {
				transaction
			})
			.catch((e) => {
				console.log(e);
				throw e;
			});

		await insertSlittingOrderItems(SlittingOrderItems, newSlittingOrder.id, transaction);

		await updateOIVL(newSlittingOrder.oivlId, transaction);

		await insertSlittingOrderMachines(SlittingOrderMachines, newSlittingOrder.id, transaction);
		await insertSlittingOrderLabours(SlittingOrderLabours, newSlittingOrder.id, transaction);

		await transaction.commit();

		return res.status(200).send({
			slittingOrder: newSlittingOrder,
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
	let { slittingOrder } = req.body;

	const inputValidation = await validateInputs(slittingOrder, validationAttributes);

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
		},
		{
			model: db.ItemMaster,
			attributes: [ 'id', 'code', 'name' ]
		},
		{
			model: db.OIVL,
			attributes: [ 'id', 'barcode' ]
		}
	];

	if (req.query.hasOwnProperty('all')) {
		return res.send({
			salesOrders: await db.SlittingOrder.findAll({
				include,
				where: {
					deleted: false
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

	filter.push({
		deleted: false
	});

	await db.SlittingOrder
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
				slittingOrders: results.rows,
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
			model: db.SlittingOrderItem,
			attributes: [ 'id', 'itemMasterId', 'quantity', 'uomId', 'weightPerPiece', 'price', 'total', 'remarks' ],
			include: [
				{
					model: db.ItemMaster,
					attributes: [ 'id', 'code', 'name', 'managementTypeId', 'inventoryUOMId' ]
				},
				{
					model: db.UOM,
					attributes: [ 'id', 'code', 'name' ]
				}
			]
		},
		{
			model: db.SlittingOrderMachine,
			include: [
				{
					model: db.MachineCenter,
					attributes: [ 'id', 'no', 'name' ]
				},
				{
					model: db.Employee,
					attributes: [ 'id', 'secondName', 'name', 'lastName' ]
				},
				{
					model: db.RoutingStages,
					attributes: [ 'id', 'name' ]
				}
			]
		},
		{
			model: db.SlittingOrderLabour,
			include: [
				{
					model: db.Employee,
					attributes: [ 'id', 'secondName', 'name', 'lastName' ]
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
			model: db.ItemMaster,
			attributes: [ 'id', 'code', 'name', 'managementTypeId', 'inventoryUOMId' ]
		},
		{
			model: db.OIVL,
			attributes: [ 'id', 'barcode' ]
		}
	];

	filter.push({
		id,
		deleted: false,
		deletedAt: null
	});

	await db.SlittingOrder
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
				slittingOrder: result,
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

		const slittingOrder = await db.SlittingOrder
			.findOne({
				attributes: [ 'id', 'oivlId', 'coilWeight' ],
				where: {
					id,
					deleted: false
				},
				transaction
			})
			.catch((error) => {
				console.log(error);
				throw error;
			});

		if (!slittingOrder) {
			return res.status(404).send({
				message: 'record Not Found',
				success: false
			});
		}

		await slittingOrder
			.update(
				{
					deleted: true,
					deletedAt: new Date()
				},
				{
					transaction
				}
			)
			.catch((error) => {
				console.log(error);
				throw error;
			});

		await updateOIVLOnDelete(slittingOrder.oivlId, slittingOrder.coilWeight, transaction);

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

const insertSlittingOrderItems = async (slittingOrderItems, slittingOrderId, transaction) => {
	console.log('########################## insertSlittingOrderItems ##############################');
	for (let i = 0; i < slittingOrderItems.length; i++) {
		const lineItem = slittingOrderItems[i];
		lineItem.slittingOrderId = slittingOrderId;

		await db.SlittingOrderItem
			.create(lineItem, {
				transaction
			})
			.catch((e) => {
				throw e;
			});
	}
};

const insertSlittingOrderMachines = async (slittingOrderMachines, slittingOrderId, transaction) => {
	console.log('###########################insertSlittingOrderMachines###############################');

	const existingMachines = await db.SlittingOrderMachine
		.findAll({
			where: {
				slittingOrderId
			},
			transaction
		})
		.catch((error) => {
			console.log(error);
			throw error;
		});

	const machineIds = slittingOrderMachines.map((x) => x.id);
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

	for (let i = 0; i < slittingOrderMachines.length; i++) {
		const item = slittingOrderMachines[i];
		var inputParams = {
			machineId: item.machineId,
			estimatedTime: item.estimatedTime,
			costPerHour: item.costPerHour,
			startDate: item.startDate,
			endDate: item.endDate,
			totalCost: item.totalCost,
			remarks: item.remarks,
			totalTime: item.totalTime,
			actualTotalTime: item.actualTotalTime,
			actualTotalCost: item.actualTotalCost,
			routingStageNumber: item.routingStageNumber,
			routingStageId: item.routingStageId,
			hoursInBaseUnit: item.hoursInBaseUnit,
			costInBaseUnit: item.costInBaseUnit,
			employeeId: item.employeeId,
			noOfLabours: item.noOfLabours
		};

		if (item.id) {
			const slittingOrderMachineObj = await db.SlittingOrderMachine
				.findOne({
					where: {
						id: item.id
					},
					transaction
				})
				.catch((error) => {
					console.log(error);
					throw error;
				});

			if (slittingOrderMachineObj) {
				await slittingOrderMachineObj
					.update(inputParams, {
						transaction
					})
					.catch((error) => {
						console.log(error);
						throw error;
					});
			}
		} else {
			inputParams.slittingOrderId = slittingOrderId;

			await db.SlittingOrderMachine
				.create(inputParams, {
					transaction
				})
				.catch((e) => {
					console.log(e);
					throw e;
				});
		}
	}
};

const insertSlittingOrderLabours = async (slittingOrderLabours, slittingOrderId, transaction) => {
	const existingLabours = await db.SlittingOrderLabour
		.findAll({
			where: {
				slittingOrderId
			}
		})
		.catch((error) => {
			console.log(error);
			throw error;
		});

	const labourIds = slittingOrderLabours.map((x) => x.id);
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

	for (let i = 0; i < slittingOrderLabours.length; i++) {
		const item = slittingOrderLabours[i];

		if (!item.employeeId) continue;

		var inputParams = {
			employeeId: item.employeeId,
			estimatedTime: item.estimatedTime,
			costPerHour: item.costPerHour,
			startDate: item.startDate,
			endDate: item.endDate,
			totalCost: item.totalCost,
			remarks: item.remarks,
			totalTime: item.totalTime,
			overTime: item.overTime,
			actualTotalTime: item.actualTotalTime,
			actualTotalCost: item.actualTotalCost,
			hoursInBaseUnit: item.hoursInBaseUnit,
			costInBaseUnit: item.costInBaseUnit
		};

		if (item.id) {
			const labourObj = await db.SlittingOrderLabour
				.findOne({
					where: {
						id: item.id
					}
				})
				.catch((error) => {
					console.log(error);
					throw error;
				});

			if (labourObj) {
				await labourObj
					.update(inputParams, {
						transaction
					})
					.catch((error) => {
						console.log(error);
						throw error;
					});
			}
		} else {
			inputParams.slittingOrderId = slittingOrderId;

			await db.SlittingOrderLabour
				.create(inputParams, {
					transaction
				})
				.catch((e) => {
					console.log(e);
					throw e;
				});
		}
	}
};

const updateOIVL = async (oivlId, transaction) => {
	console.log('########################## updateOIVL ##############################');

	const oivl = await db.OIVL
		.findOne({
			where: {
				id: oivlId,
				openQty: {
					[Op.gt]: 0
				}
			},
			transaction
		})
		.catch((e) => {
			throw e;
		});

	if (!oivl) throw new Error('Coil Number / Batch not found!');

	await oivl
		.update(
			{
				outQty: +oivl.outQty + +oivl.openQty,
				openQty: 0
			},
			{
				transaction
			}
		)
		.catch((e) => {
			throw e;
		});
};

const updateOIVLOnDelete = async (oivlId, coilWeight, transaction) => {
	console.log('########################## updateOIVLOnDelete ##############################');

	const oivl = await db.OIVL
		.findOne({
			where: {
				id: oivlId
			},
			transaction
		})
		.catch((e) => {
			throw e;
		});

	if (!oivl) throw new Error('OIVL not found');

	// Update the OIVL
	await oivl
		.update(
			{
				openQty: coilWeight,
				outQty: +oivl.outQty - +coilWeight
			},
			{
				transaction
			}
		)
		.catch((e) => {
			throw e;
		});
};
