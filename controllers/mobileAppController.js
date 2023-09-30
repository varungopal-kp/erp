const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const paginate = require('express-paginate');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const moment = require('moment');
const { isNumber, isNull } = require('lodash');

const db = require('../models/index');
const User = require('../models').User;
const Branch = require('../models').Branch;
const Warehouse = require('../models').Warehouse;
const UOM = require('../models').UOM;
const Status = require('../models').Status;
const ProductionOrder = require('../models').ProductionOrder;
const ProductionOrderComponents = require('../models').ProductionOrderComponents;
const ItemMaster = require('../models').ItemMaster;
const ProductionOrderMachines = require('../models').ProductionOrderMachines;
const ProductionOrderLabours = require('../models').ProductionOrderLabours;
const Employee = require('../models').Employee;
const MachineCenter = require('../models').MachineCenter;
const ProductionOrderMachinesAllocations = require('../models').ProductionOrderMachinesAllocations;
const ProductionOrderLogs = require('../models').ProductionOrderLogs;
const ProductionUnit = require('../models').ProductionUnit;
const WorkCenter = require('../models').WorkCenter;
const OIVL = require('../models').OIVL;
const TransactionNumber = require('../models').TransactionNumbers;
const ProductionIssue = require('../models').ProductionIssue;
const ProductionIssueItems = require('../models').ProductionIssueItems;
const WarehouseItem = require('../models').WarehouseItems;
const ProductionIssueOIVL = require('../models').ProductionIssueOIVLs;
const ProductionReceipt = require('../models').ProductionReceipt;
const ProductionReceiptItems = require('../models').ProductionReceiptItems;
const ProductionReceiptOIVL = require('../models').ProductionReceiptOIVL;
const ProductionOrderBundleNumbers = require('../models').ProductionOrderBundleNumbers;

const status = require('../config/status');
const helper = require('../helpers/helper');

exports.login = async (req, res, next) => {
	const email = req.body.email;
	const password = req.body.password;

	const user = await User.findOne({
		include: [
			{
				model: Branch,
				as: 'branch'
			}
		],
		where: {
			email: email
		}
	});

	if (!user) {
		return res.status(200).send({
			success: false,
			error: 'Incorrect Email !!!',
			message: 'Incorrect Email !!!'
		});
	}

	const userInfo = {
		id: user.id,
		name: user.name,
		username: user.username,
		email: user.email,
		branch: user.branch.name,
		branchId: user.branchId
		// isSuperAdmin: user.isSuperAdmin,
		// userPrivileges: userPrivileges
	};

	if (bcrypt.compareSync(password, user.password)) {
		const token = jwt.sign(
			{
				user: userInfo
			},
			process.env.JWT_KEY,
			{
				expiresIn: 604800 //1 week
			}
		);

		// // Get user privileges
		// const userPrivileges = await UserPrivilege.findAll({
		//   attributes: ['moduleId', 'read', 'write'],
		//   include: [{
		//     model: Module,
		//     attributes: ['name', 'slug']
		//   }],
		//   order: [
		//     ['id', 'ASC'],
		//   ],
		//   where: {
		//     userId: user.id
		//   }
		// })

		res.json({
			success: true,
			message: 'Successfully Logged In.',
			token: token,
			user: userInfo
		});
	} else {
		return res.status(200).send({
			success: false,
			error: 'Incorrect Password !!!',
			message: 'Incorrect Password !!!'
		});
	}
};

exports.productionOrderList = async (req, res, next) => {
	try {
		let filter = [
			{
				statusId: {
					[Op.ne]: status.closed
				}
			}
		];

		let include = [
			{
				model: ItemMaster,
				attributes: [ 'name' ]
			},
			{
				model: Warehouse,
				attributes: [ 'name' ]
			},
			{
				model: UOM,
				attributes: [ 'name' ]
			},
			{
				model: User,
				attributes: [ 'id', 'username' ]
			},
			{
				model: Status,
				attributes: [ 'name' ]
			}
		];

		// if (req.query.hasOwnProperty("issue")) {
		//     let productionOrders = await fetchProductionOrdersForProductionIssue(req, res)
		//     return res.send({
		//         productionOrders: productionOrders
		//     })
		// }

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

		if (req.user) {
			filter.push({
				branchId: req.user.branchId
			});
		}

		if (req.query.hasOwnProperty('released')) {
			filter.push({
				statusId: {
					[Op.notIn]: [ status.planned, status.closed ]
				}
			});
		}

		if (req.query.status && req.query.status == 'planned') {
			filter.push({
				statusId: status.planned
			});
		}

		if (req.query.status && req.query.status == 'released') {
			filter.push({
				statusId: status.released
			});
		}

		if (req.query.status && req.query.status == 'rescheduled') {
			filter.push({
				statusId: status.rescheduled
			});
		}

		if (req.query.status && req.query.status == 'componentsIssued') {
			filter.push({
				statusId: status.componentsIssued
			});
		}

		if (req.query.status && req.query.status == 'productReceived') {
			filter.push({
				statusId: status.productReceived
			});
		}

		filter.push({
			deleted: false
		});

		await ProductionOrder.findAndCountAll({
			include: include,
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
					data: results.rows,
					pageCount,
					itemCount,
					pages: paginate.getArrayPages(req)(3, pageCount, req.query.page),
					success: true,
					message: 'Successfully fetched dta.'
				});
			})
			.catch((error) => {
				throw error;
			});
	} catch (error) {
		console.log(error);

		return res.status(200).send({
			success: false,
			message: 'Failed to fetch data!',
			error: error
		});
	}
};

exports.getProductionOrder = async (req, res, next) => {
	const { id } = req.params;

	let componentsInclude = {
		model: ProductionOrderComponents,
		attributes: [
			'id',
			'productId',
			'quantityPerUnit',
			'totalQuantity',
			'quantityPerUnit',
			'quantityPerUnit',
			'uomId',
			'unitCost',
			'totalCost',
			'warehouseId'
		],
		include: [
			{
				model: ItemMaster,
				attributes: [ 'code', 'name' ]
			},
			{
				model: UOM,
				attributes: [ 'code' ]
			}
			// {
			//     model: Warehouse,
			//     attributes: ["name"],
			// }
		]
	};

	let machinesInclude = {
		model: ProductionOrderMachines,
		attributes: [
			'id',
			'machineId',
			'estimatedTime',
			'costPerHour',
			'totalCost',
			'routingStageNumber',
			'routingStageId',
			'totalTime',
			'actualTotalCost',
			'actualTotalTime'
		],
		include: [
			{
				model: MachineCenter,
				attributes: [ 'no', 'name' ]
			}
		]
	};

	let laboursInclude = {
		model: ProductionOrderLabours,
		attributes: [
			'id',
			'employeeId',
			'estimatedTime',
			'costPerHour',
			'totalCost',
			'totalTime',
			'actualTotalCost',
			'actualTotalTime'
		],
		include: [
			{
				model: Employee,
				attributes: [ 'name' ]
			}
		]
	};

	var include = [
		componentsInclude,
		machinesInclude,
		laboursInclude,
		{
			model: ItemMaster,
			attributes: [ 'code', 'name' ]
		},
		{
			model: UOM,
			attributes: [ 'code', 'name' ]
		},
		{
			model: Warehouse,
			attributes: [ 'code', 'name' ]
		},
		{
			model: User,
			attributes: [ 'username' ]
		},
		{
			model: ProductionOrderMachinesAllocations,
			attributes: [ 'machineId', 'date', 'numberOfHours', 'remainingHours' ],
			include: [
				{
					model: MachineCenter,
					attributes: [ 'no', 'name' ]
				}
			]
		},
		{
			model: ProductionOrderLogs,
			attributes: [ 'message', 'createdUser' ],
			include: [
				{
					model: User,
					attributes: [ 'username' ]
				}
			],
			order: [ [ 'id', 'DESC' ] ]
		}
	];

	await ProductionOrder.findOne({
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
				productionOrder: result,
				success: true,
				message: 'Success'
			});
		})
		.catch((error) =>
			res.status(200).send({
				error: error.message,
				success: false,
				message: 'Failed'
			})
		);
};

exports.machineAllocations = async (req, res, next) => {
	let filter = [];

	let include = [];
	let workCenterInclude = [];

	if (req.query.productionUnitId) {
		filter.push({
			productionUnitId: req.query.productionUnitId
		});
	}

	if (req.query.machineId) {
		filter.push({
			machineId: req.query.machineId
		});
	}

	include.push({
		model: ProductionOrder,
		attributes: []
	});

	include.push({
		model: ProductionUnit,
		attributes: []
	});

	if (req.query.workCenterId) {
		workCenterInclude.push({
			model: WorkCenter,
			attributes: [],
			where: {
				id: req.query.workCenterId
			},
			required: true
		});
	} else {
		workCenterInclude.push({
			model: WorkCenter,
			attributes: []
		});
	}

	include.push({
		model: MachineCenter,
		attributes: [],
		include: workCenterInclude
	});

	let fromDate = moment().add(-1, 'days').format('Y-M-D');
	let toDate = moment().add(7, 'days').format('Y-M-D');

	console.log('fromDate', fromDate);
	console.log('toDate', toDate);

	filter.push({
		date: {
			[Op.between]: [ fromDate, toDate ]
		}
	});

	await ProductionOrderMachinesAllocations.findAll({
		attributes: [
			[ Sequelize.literal('"ProductionOrder"."series"'), 'series' ],
			[ Sequelize.literal('"ProductionOrder"."docNum"'), 'docNo' ],
			[ Sequelize.literal('"MachineCenter"."name"'), 'machine' ],
			[ Sequelize.literal('"MachineCenter->WorkCenter"."name"'), 'workCenter' ],
			[ Sequelize.literal('"ProductionUnit"."name"'), 'productionUnit' ],
			[ Sequelize.literal('to_char("date", \'DD-MM-YYYY\')'), 'date' ],
			[ Sequelize.literal('"numberOfHours"'), 'allocatedHours' ],
			[ Sequelize.literal('"remainingHours"'), 'remainingHours' ]
		],
		include: include,
		raw: true,
		where: filter,
		order: [ [ 'id', 'DESC' ] ]
	})
		.then(async (results) => {
			return res.status(200).send({
				data: results,
				success: true,
				message: 'Success'
			});
		})
		.catch((error) => {
			return res.status(200).send({
				error: error.message
			});
		});
};

exports.getOIVLDetails = async (req, res, next) => {
	const { barcode } = req.params;

	var include = [
		{
			model: ItemMaster,
			attributes: [ 'code', 'name' ],
			as: 'ItemMaster',
			include: {
				model: UOM,
				attributes: [ 'code', 'name' ],
				as: 'InventoryUOM'
			}
		},
		{
			model: Warehouse,
			attributes: [ 'code', 'name' ],
			as: 'Warehouse'
		}
	];

	await OIVL.findOne({
		attributes: [ 'id', 'barcode', 'itemMasterId', 'warehouseId', 'openQty', 'price' ],
		where: {
			barcode,
			openQty: {
				[Op.gt]: 0
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
				data: result,
				success: true,
				message: 'Success'
			});
		})
		.catch((error) =>
			res.status(200).send({
				error: error.message,
				success: false,
				message: 'Failed'
			})
		);
};

exports.productionIssue = async (req, res, next) => {
	/**
     1. Check latest PIS document and if not created create a doc with POR components and qty, price =0
     2. Loop through the barcodes, if exist & openQty>0 update the PIS with qty and price (if zero)    
     3. Update warehouse stock and price   
     **/

	let transaction;
	try {
		const { productionOrderId } = req.params;

		const inputParams = req.body;

		if (!inputParams || !inputParams.components) throw 'Input parameters missing!';

		await validateProductionIssue(productionOrderId, inputParams.components);

		transaction = await db.sequelize.transaction().catch((e) => {
			console.log(e);
			throw e;
		});

		const productionIssue = await allocateProductionIssue(req, productionOrderId, transaction);

		await updateProductionIssueComponents(productionOrderId, productionIssue, inputParams.components, transaction);

		await updateProductionOrder(productionOrderId, status.componentsIssued, transaction);

		const message = `${req.user.username ||
			'Unknown user'} issued components against the Production Order on ${moment().format(
			'DD-MM-YYYY hh:mm:ss A'
		)}`;
		await helper.createProductionOrderLog(productionOrderId, message, req.user.id || null, transaction);

		await transaction.commit();

		return res.status(200).send({
			data: productionIssue,
			success: true,
			message: 'Component Issue Successfull.'
		});
	} catch (error) {
		if (transaction) await transaction.rollback();
		console.log(error);
		return res.status(200).send({
			success: false,
			message: helper.getErrorMessage(error),
			error: error
		});
	}
};

const validateProductionIssue = async (productionOrderId, components) => {
	const productionOrder = await ProductionOrder.findOne({
		where: {
			id: productionOrderId,
			statusId: {
				[Op.ne]: status.closed
			}
		}
		// order: [ [ 'id', 'DESC' ] ]
	}).catch((e) => {
		throw e;
	});

	if (!productionOrder) throw 'Production Order not found!';

	for (let i = 0; i < components.length; i++) {
		const component = components[i];

		const oivl = await OIVL.findOne({
			where: {
				barcode: component.barcode
				// openQty: {
				//     [Op.gt]: 0
				// }
			}
		}).catch((e) => {
			throw e;
		});

		if (!oivl) throw `Batch ${component.barcode} not found.`;
		if (oivl && +oivl.openQty <= 0) throw `Batch ${component.barcode} does not have stock to issue.`;
		if (oivl && component.quantity > oivl.openQty)
			throw `Batch ${component.barcode} does not have enough stock to issue.`;
	}
};

const allocateProductionIssue = async (req, productionOrderId, transaction) => {
	console.log('##################################allocateProductionIssue######################################');
	let productionIssue = await ProductionIssue.findOne({
		where: {
			productionOrderId
		},
		order: [ [ 'id', 'DESC' ] ]
	}).catch((e) => {
		throw e;
	});

	if (productionIssue) return productionIssue;

	const productionOrder = await ProductionOrder.findOne({
		attributes: [ 'warehouseId' ],
		where: {
			id: productionOrderId
		},
		include: [
			{
				model: ProductionOrderComponents,
				attributes: [ 'productId', 'uomId', 'unitCost' ],
				required: true,
				include: {
					model: ItemMaster,
					required: true
				}
			}
		]
	}).catch((e) => {
		throw e;
	});

	if (!productionOrder) throw 'Production Order not found!';

	let transactionNumber = await getDocumentNumber(productionOrder.warehouseId, 'PIS', transaction);

	if (!transactionNumber) {
		transactionNumber = await TransactionNumber.create(
			{
				objectCode: 'PIS',
				series: 'General',
				transactionTypeId: 4,
				initialNumber: 100,
				nextNumber: 100
			},
			{
				transaction
			}
		).catch((e) => {
			throw e;
		});
	}

	const productionIssueParams = {
		docNum: transactionNumber.nextNumber,
		series: transactionNumber.series,
		productionOrderId,
		branchId: req.user.branchId || null,
		remarks: 'created when issuing from mobile application',
		createdUser: req.user.id || null,
		grandTotal: 0,
		docDate: new Date()
	};

	let productionIssueItems = [];

	productionOrder.ProductionOrderComponents.forEach((component) => {
		productionIssueItems.push({
			productId: component.productId,
			uomId: component.uomId,
			issuedQuantity: 0,
			managementTypeId: component.ItemMaster.managementTypeId || null
		});
	});

	productionIssueParams.ProductionIssueItems = productionIssueItems;

	const newProductionIssue = await ProductionIssue.create(productionIssueParams, {
		include: [
			{
				model: ProductionIssueItems,
				required: true
			}
		]
	}).catch((e) => {
		console.log(e);
		throw e;
	});

	return newProductionIssue;
};

const getDocumentNumber = async (warehouseId, type, transaction) => {
	console.log('#################getDocumentNumber################################');
	let series = null;

	switch (warehouseId) {
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

	return await helper.getNextDocumentNumber(type, series, transaction);
};

const updateProductionIssueComponents = async (productionOrderId, productionIssue, components, transaction) => {
	console.log('###########################updateProductionIssueComponents###################################');

	let grandTotal = +productionIssue.grandTotal;

	for (let i = 0; i < components.length; i++) {
		const component = components[i];

		if (isNull(component.itemMasterId) || isNull(component.quantity) || component.quantity === 0) continue;

		// Fetch the batch to issue
		const oivl = await OIVL.findOne({
			where: {
				itemMasterId: component.itemMasterId,
				barcode: component.barcode,
				openQty: {
					[Op.gt]: 0
				}
			},
			include: {
				model: ItemMaster,
				as: 'ItemMaster'
			}
		}).catch((e) => {
			throw e;
		});

		if (!oivl) throw `Batch not found for ${component.barcode}`;

		//Fetch warehouse price
		const warehouseItem = await WarehouseItem.findOne({
			where: {
				warehouseId: oivl.warehouseId,
				itemMasterId: oivl.itemMasterId
			}
		}).catch((e) => {
			throw e;
		});

		const price = +warehouseItem.price ? +warehouseItem.price : 0;

		const totalPrice = price * component.quantity;

		// Fetch the productionIssueItem to update the quantity
		let productionIssueItem = await ProductionIssueItems.findOne({
			where: {
				productionIssueId: productionIssue.id,
				productId: oivl.itemMasterId
			}
		}).catch((e) => {
			throw e;
		});

		const itemParams = {
			productionIssueId: productionIssue.id,
			productId: oivl.itemMasterId,
			warehouseId: oivl.warehouseId,
			issuedQuantity: component.quantity,
			uomId: oivl.ItemMaster.inventoryUOMId,
			price,
			total: +totalPrice || 0
		};

		if (!productionIssueItem) {
			productionIssueItem = await ProductionIssueItems.create(itemParams, {
				transaction
			}).catch((e) => {
				throw e;
			});
		} else {
			itemParams.issuedQuantity = +productionIssueItem.issuedQuantity + +component.quantity;
			itemParams.total = +productionIssueItem.total + +totalPrice;

			await productionIssueItem
				.update(itemParams, {
					transaction
				})
				.catch((e) => {
					throw e;
				});
		}

		await updateOIVLData(oivl, productionIssue, +component.quantity, transaction);

		await updateOnHandQuantity(warehouseItem, +component.quantity, transaction);

		await updateIssuedQtyInProductionOrder(productionOrderId, oivl.itemMasterId, +component.quantity, transaction);

		await updateWarehouseItemPrice(
			+component.quantity,
			oivl.itemMasterId,
			oivl.warehouseId,
			warehouseItem,
			transaction
		);

		grandTotal += +totalPrice;
	}

	await productionIssue
		.update(
			{
				grandTotal
			},
			{
				transaction
			}
		)
		.catch((e) => {
			throw e;
		});
};

const updateProductionOrder = async (productionOrderId, status, transaction) => {
	console.log('#########################updateProductionOrder#############################');

	const productionOrder = await ProductionOrder.findOne({
		where: {
			id: productionOrderId
		},
		transaction
	}).catch((e) => {
		throw e;
	});

	await productionOrder
		.update(
			{
				statusId: status
			},
			{
				transaction
			}
		)
		.catch((e) => {
			throw e;
		});
};

const updateOIVLData = async (oivl, productionIssue, quantity, transaction) => {
	console.log('###########################updateOIVLData###################################');

	const quantityInBaseUnit = await helper.getConvertedQuantity(
		oivl.ItemMaster.inventoryUOMId,
		oivl.itemMasterId,
		quantity
	);

	await oivl
		.update(
			{
				outQty: +oivl.outQty + +quantityInBaseUnit,
				openQty: oivl.openQty - quantityInBaseUnit
			},
			{
				transaction
			}
		)
		.catch((e) => {
			throw e;
		});

	//Insert Production Issue OIVLs
	await ProductionIssueOIVL.create(
		{
			productionIssueId: productionIssue.id,
			oivlId: oivl.id,
			quantity
		},
		{
			transaction
		}
	).catch((e) => {
		console.log(e);
		throw e;
	});

	//Add OIVL
	await OIVL.create(
		{
			docNum: productionIssue.docNum,
			docType: 'PIS',
			documentId: productionIssue.id,
			itemMasterId: oivl.itemMasterId,
			warehouseId: oivl.warehouseId,
			outQty: quantity
		},
		{
			transaction
		}
	).catch((e) => {
		console.log(e);
		throw e;
	});
};

const updateOnHandQuantity = async (warehouseItem, quantity, transaction) => {
	console.log('###########################updateOnHandQuantity###################################');

	// const quantityInBaseUnit = await helper.getConvertedQuantity(
	// 	oivl.ItemMaster.inventoryUOMId,
	// 	warehouseItem.itemMasterId,
	// 	quantity
	// );

	await warehouseItem
		.decrement(
			{
				onHand: +quantity
			},
			{
				transaction
			}
		)
		.catch((e) => {
			console.log(e);
			throw e;
		});
};

const updateIssuedQtyInProductionOrder = async (productionOrderId, itemMasterId, quantity, transaction) => {
	console.log('###########################updateIssuedQtyInProductionOrder###################################');

	await ProductionOrderComponents.increment(
		{
			issuedQuantity: +quantity
		},
		{
			where: {
				productionOrderId,
				productId: itemMasterId
			},
			transaction
		}
	).catch((e) => {
		throw e;
	});
};

const updateWarehouseItemPrice = async (quantity, itemMasterId, warehouseId, warehouseItem, transaction) => {
	console.log('######################updateWarehouseItemPrice###########################');
	let price = +warehouseItem.price || 0;

	let itemMaster = await ItemMaster.findOne({
		where: {
			id: itemMasterId
		}
	}).catch((e) => {
		console.log(e);
		throw e;
	});

	let oivls = [];

	if (itemMaster.valuationMethod == 'm') {
		// Moving Average
		oivls = await OIVL.findAll({
			where: {
				itemMasterId: itemMasterId,
				warehouseId: warehouseId,
				openQty: {
					[Op.gt]: 0
				},
				deleted: false
			}
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		//Fetch total quantity
		let oivlTotalOpenQty = oivls.map((oivlObj) => +oivlObj.openQty).reduce((a, b) => a + b, 0);

		oivlTotalOpenQty = +oivlTotalOpenQty + +quantity;

		//Fetch total price
		price = oivls
			.map((oivlObj) => {
				return oivlObj.openQty * oivlObj.price;
			})
			.reduce((a, b) => a + b, 0);

		price += +quantity * +price;

		//Calculate average price
		price = (price / oivlTotalOpenQty).toFixed(4);

		console.log('Updated Price', price);
	}

	await warehouseItem
		.update(
			{
				price: price
			},
			{
				transaction
			}
		)
		.catch((e) => {
			console.log(e);
			throw e;
		});
};

exports.updateMachineActualTime = async (req, res, next) => {
	let transaction;
	try {
		const { productionOrderId } = req.params;

		const inputParams = req.body;

		if (!inputParams || !inputParams.length) throw 'Input parameters missing!';

		transaction = await db.sequelize.transaction().catch((e) => {
			console.log(e);
			throw e;
		});

		await updateMachineTime(inputParams, transaction);

		const message = `${req.user.username ||
			'Unknown user'} updated actual time against the Production Order machine on ${moment().format(
			'DD-MM-YYYY hh:mm:ss A'
		)}`;
		await helper.createProductionOrderLog(productionOrderId, message, req.user.id || null, transaction);

		await transaction.commit();

		return res.status(200).send({
			success: true,
			message: 'Actual time updated for the Production Order.'
		});
	} catch (error) {
		console.log(error);
		if (transaction) await transaction.rollback();

		return res.status(200).send({
			success: false,
			message: helper.getErrorMessage(error),
			error: error
		});
	}
};

const updateMachineTime = async (inputParams, transaction) => {
	for (let i = 0; i < inputParams.length; i++) {
		const productionOrderMachine = inputParams[i];

		const machine = await ProductionOrderMachines.findOne({
			where: {
				id: productionOrderMachine.productionOrderMachineId
			}
		}).catch((e) => {
			throw e;
		});

		if (!machine) throw 'Production Order Machine not found!';

		await machine
			.update(
				{
					actualTotalTime: productionOrderMachine.actualTime
				},
				{
					transaction
				}
			)
			.catch((e) => {
				throw e;
			});
	}
};

exports.productionReceiptList = async (req, res, next) => {
	try {
		let filter = [
			{
				verified: false,
				deleted: false
			}
		];

		let include = [
			{
				model: ProductionOrder,
				attributes: [
					'id',
					[
						Sequelize.fn(
							'concat',
							Sequelize.col('ProductionOrder.series'),
							'-',
							Sequelize.col('ProductionOrder.docNum')
						),
						'Production Order'
					]
				]
			}
		];

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

		if (req.user) {
			filter.push({
				branchId: req.user.branchId
			});
		}

		await ProductionReceipt.findAndCountAll({
			attributes: [ 'id', 'series', 'docNum', 'productionOrderId', 'grandTotal', 'totalQty', 'verified' ],
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
					data: results.rows,
					pageCount,
					itemCount,
					pages: paginate.getArrayPages(req)(3, pageCount, req.query.page),
					success: true,
					message: 'Successfully fetched dta.'
				});
			})
			.catch((error) => {
				throw error;
			});
	} catch (error) {
		console.log(error);

		return res.status(200).send({
			success: false,
			message: 'Failed to fetch data!',
			error: error
		});
	}
};

exports.getProductionReceipt = async (req, res, next) => {
	const { id } = req.params;

	try {
		let include = [
			{
				model: ProductionOrder,
				attributes: [
					'id',
					[
						Sequelize.fn(
							'concat',
							Sequelize.col('ProductionOrder.series'),
							'-',
							Sequelize.col('ProductionOrder.docNum')
						),
						'Production Order'
					]
				]
			},
			{
				model: ProductionReceiptItems,
				attributes: [
					'id',
					'productId',
					'warehouseId',
					'receiptQuantity',
					'uomId',
					'rejectionQuantity',
					'rejectionUomId',
					'unitCost',
					'total'
				],
				include: [
					{
						model: ItemMaster,
						attributes: [ 'id', 'code', 'name' ]
					},
					{
						model: Warehouse,
						attributes: [ 'id', 'code', 'name' ]
					},
					{
						model: UOM,
						attributes: [ 'id', 'code', 'name' ],
						as: 'receiptUOM'
					},
					{
						model: UOM,
						attributes: [ 'id', 'code', 'name' ],
						as: 'rejectionUOM'
					}
				]
			},
			{
				model: ProductionReceiptOIVL,
				attributes: [ 'id', 'quantity' ],
				include: {
					model: OIVL,
					attributes: [ 'id', 'barcode' ]
				}
			},
			{
				model: ProductionOrderBundleNumbers,
				attributes: [ 'id', 'bundleNumber', 'available' ],
				as: 'ProductionReceiptBundles'
			}
		];

		await ProductionReceipt.findOne({
			attributes: [ 'id', 'series', 'docNum', 'productionOrderId', 'grandTotal', 'totalQty', 'verified' ],
			include,
			where: {
				id
			}
		})
			.then(async (result) => {
				if (!result) {
					return res.status(404).send({
						message: 'record Not Found',
						success: false
					});
				}

				return res.send({
					productionReceipt: result,
					success: true,
					message: 'Successfully fetched dta.'
				});
			})
			.catch((error) => {
				throw error;
			});
	} catch (error) {
		console.log(error);

		return res.status(200).send({
			success: false,
			message: 'Failed to fetch data!',
			error: error
		});
	}
};

exports.verifyProductionReceipt = async (req, res, next) => {
	const { id } = req.params;

	try {
		const productionReceipt = await ProductionReceipt.findOne({
			attributes: [ 'id' ],
			where: {
				id
			}
		}).catch((error) => {
			throw error;
		});

		if (!productionReceipt)
			return res.status(404).send({
				message: 'record Not Found',
				success: false
			});

		await productionReceipt
			.update({
				verified: true
			})
			.catch((error) => {
				throw error;
			});

		return res.send({
			productionReceipt,
			success: true,
			message: 'Production Receipt verified successfully.'
		});
	} catch (error) {
		console.log(error);

		return res.status(200).send({
			success: false,
			message: 'Failed to fetch data!',
			error: error
		});
	}
};
