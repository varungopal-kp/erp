const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const xlsx = require('xlsx');
const { google } = require('googleapis');
const fs = require('fs');

const googleCredentials = require('../config/google-api-credentials.json');
const db = require('../models/index');
const SalesOrder = require('../models').SalesOrder;
const SalesOrderItem = require('../models').SalesOrderItem;
const ItemMaster = require('../models').ItemMaster;
const UOM = require('../models').UOM;
const Warehouse = require('../models').Warehouse;
const Branch = require('../models').Branch;
const Currency = require('../models').Currency;
const OIVL = require('../models').OIVL;
const BusinessPartner = require('../models').BusinessPartner;
const BillOfMaterial = require('../models').BillOfMaterials;
const BOMComponent = require('../models').BOMComponents;
const BOMLabour = require('../models').BOMLabours;
const BOMMachine = require('../models').BOMMachines;
const ProductionOrder = require('../models').ProductionOrder;
const ProductionOrderComponents = require('../models').ProductionOrderComponents;
const ProductionOrderMachines = require('../models').ProductionOrderMachines;
const ProductionOrderLabours = require('../models').ProductionOrderLabours;
const PurchasePlan = require('../models').PurchasePlan;
const SalesOrderPlan = require('../models').SalesOrderPlan;
const SalesOrderPlanProductions = require('../models').SalesOrderPlanProductions;
const SalesOrderPlanPurchases = require('../models').SalesOrderPlanPurchases;
const ItemMasterUOMs = require('../models').ItemMasterUOMs;
const WarehouseItems = require('../models').WarehouseItems;
const _ = require('lodash');
const moment = require('moment');
const paginate = require('express-paginate');
const helper = require('../helpers/helper');
const status = require('../config/status');

let purchasePlans = [];

exports.list = async (req, res, next) => {
	var filter = [];
	var include = [
		{
			model: SalesOrderItem,
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
			model: Branch
		},
		{
			model: Currency
		},
		{
			model: BusinessPartner
		}
	];

	if (req.query.hasOwnProperty('all')) {
		return res.send({
			salesOrders: await SalesOrder.findAll({
				include: include,
				where: {
					deleted: {
						[Op.eq]: false
					}
					// statusId: {
					//     [Op.ne]: status.closed
					// }
				}
			})
		});
	}

	// if (req.query.hasOwnProperty("open")) {

	//     const openSalesOrders = await getOpenSalesOrders(req, res, include)
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

	if (req.query.status && req.query.status == 'planned') {
		filter.push({
			statusId: status.planned
		});
	}

	filter.push({
		deleted: false
	});

	await SalesOrder.findAndCountAll({
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
				salesOrders: results.rows,
				pageCount,
				itemCount,
				pages: paginate.getArrayPages(req)(3, pageCount, req.query.page)
			});
		})
		.catch((error) => {
			return res.status(400).send({
				error: error
			});
		});
};

exports.openSalesOrders = async (req, res, next) => {
	var include = [
		{
			model: SalesOrderItem,
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
			model: Branch
		},
		{
			model: Currency
		},
		{
			model: BusinessPartner
		}
	];

	let salesOrders = await SalesOrder.findAll({
		include: include,
		where: {
			status: 'open',
			deleted: false,
			closed: false
		},
		order: [ [ 'id', 'DESC' ] ]
		// raw: true,
		// nest: true,
	}).catch((error) => {
		return res.status(400).send({
			error: error
		});
	});

	if (salesOrders && salesOrders.length > 0) {
		let completeFlag = 0;
		let totalAvailableQty = 0,
			consumedQty = [];

		for (let i = 0; i < salesOrders.length; i++) {
			let salesOrder = salesOrders[i];
			let salesOrderItems = salesOrders[i].SalesOrderItems;
			let totalPendingQty = 0,
				totalRequiredQty = 0;

			if (salesOrderItems && salesOrderItems.length > 0) {
				let salesOrderItemsCount = salesOrderItems.length;
				// await getFulfillmentData(salesOrderItems, salesOrderCount, totalRequiredQty, totalAvailableQty)

				for (let j = 0; j < salesOrderItems.length; j++) {
					const salesOrderItem = salesOrderItems[j];

					const itemMasterId = salesOrderItem.itemMasterId;

					// //Calculating the total required quantity
					// const uomConversionFactor = await ItemMasterUOMs.findOne({
					//     where: {
					//         itemMasterId: itemMasterId,
					//         uomId: salesOrderItem.uomId
					//     },
					//     attributes: ['conversionFactor'],
					//     raw: true
					// }).catch(error => {
					//     return res.status(400).send({
					//         error: error
					//     })
					// })

					// if (uomConversionFactor && uomConversionFactor.conversionFactor)
					//     requiredQty = requiredQty * uomConversionFactor.conversionFactor

					let requiredQty = await helper.getConvertedQuantity(
						salesOrderItem.uomId,
						itemMasterId,
						salesOrderItem.quantity
					);

					totalRequiredQty += +requiredQty;

					//Calculate available quantity
					const warehouseItems = await WarehouseItems.findAll({
						where: {
							itemMasterId: itemMasterId,
							isDamage: false,
							onHand: {
								[Op.gt]: 0
							}
						},
						attributes: [ 'onHand', 'commited', 'onOrder' ],
						raw: true
					}).catch((error) => {
						return res.status(400).send({
							error: error
						});
					});

					let availableQty = 0;

					warehouseItems.map((warehouseItem) => {
						availableQty +=
							(+warehouseItem.onHand || 0) -
							(+warehouseItem.committed || 0) +
							(+warehouseItem.onOrder || 0);
					});

					totalAvailableQty += +availableQty;

					let consumedQtyTillNow = 0;

					//Manage consumed stock
					if (consumedQty.length > 0) {
						consumedQty.forEach((stockItem) => {
							if (stockItem.itemMasterId == itemMasterId) {
								consumedQtyTillNow = +stockItem.consumedQty;

								if (requiredQty > availableQty)
									stockItem.consumedQty = +stockItem.consumedQty + +availableQty;
								else stockItem.consumedQty = +stockItem.consumedQty + +requiredQty;
							}
						});
					}

					if (consumedQtyTillNow == 0) {
						let consumed = 0;

						requiredQty > availableQty ? (consumed = +availableQty) : (consumed = +requiredQty);

						consumedQty.push({
							itemMasterId: itemMasterId,
							consumedQty: consumed
						});
					}

					let updatedAvailableQuantity = +availableQty - +consumedQtyTillNow;

					console.log('docNum', salesOrder.docNum);
					console.log('availableQty', availableQty);
					console.log('consumedQtyTillNow', consumedQtyTillNow);
					console.log('updatedAvailableQuantity', updatedAvailableQuantity);

					if (requiredQty > updatedAvailableQuantity) {
						totalPendingQty += +requiredQty - updatedAvailableQuantity;
					}

					console.log('ItemRequiredQty', requiredQty);

					salesOrderItemsCount--;
				}

				if (salesOrderItemsCount === 0) {
					let fulFilled = false;

					if (totalPendingQty === 0 || totalPendingQty < 0) fulFilled = true;

					let fullFillmentPercentage = 100;
					if (totalPendingQty > 0 && totalPendingQty != totalRequiredQty)
						fullFillmentPercentage = Math.round(+totalPendingQty / +totalRequiredQty * 100);
					else if (+totalPendingQty === +totalRequiredQty) {
						fullFillmentPercentage = 0;
					}

					salesOrder.setDataValue('totalRequiredQty', totalRequiredQty);
					salesOrder.setDataValue('totalAvailableQty', totalAvailableQty);
					salesOrder.setDataValue('totalPendingQty', totalPendingQty);

					salesOrder.setDataValue('fulFillmentPercentage', fullFillmentPercentage);
					salesOrder.setDataValue('fulFilled', fulFilled);
				}
			}
		}

		return res.send({
			salesOrders: salesOrders,
			success: true
		});
	} else {
		return res.send({
			salesOrders: [],
			success: true
		});
	}
};

exports.create = async (req, res, next) => {
	let { salesOrder } = req.body;

	if (req.headers.user) salesOrder.createdUser = req.headers.user;

	var include = [
		{
			model: SalesOrderItem,
			required: true
		}
	];

	let transaction;

	const nextDocNo = await helper.getNextDocumentNumber('SOR', salesOrder.series);

	if (nextDocNo) salesOrder.docNum = nextDocNo.nextNumber;

	salesOrder.status = 'open';

	let month = moment(salesOrder.docDate).month() + 1;
	let year = moment(salesOrder.docDate).year();
	let quarter = moment(salesOrder.docDate).quarter();

	salesOrder.month = month;
	salesOrder.year = year;
	salesOrder.quarter = quarter;

	try {
		transaction = await db.sequelize.transaction().catch((e) => {
			console.log(e);
			throw e;
		});

		const newSalesOrder = await SalesOrder.create(salesOrder, {
			include: include,
			transaction: transaction
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		await transaction.commit();

		return res.status(200).send({
			salesOrder: newSalesOrder,
			success: true,
			message: 'Success'
		});
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
	let { salesOrder } = req.body;

	const { SalesOrderItems } = salesOrder;

	const salesOrderId = req.params.id;

	let transaction = await db.sequelize.transaction().catch((e) => {
		console.log(e);
		throw e;
	});

	try {
		const existingSalesOrder = await SalesOrder.findOne({
			where: {
				id: salesOrderId,
				deleted: {
					[Op.eq]: false
				}
			}
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		await existingSalesOrder
			.update(salesOrder, {
				transaction
			})
			.catch((e) => {
				console.log(e);
				throw e;
			});

		if (existingSalesOrder && existingSalesOrder.id) {
			await insertSalesOrderItems(SalesOrderItems, salesOrderId, transaction);

			// commit
			await transaction.commit();

			return res.status(200).send({
				salesOrder: existingSalesOrder,
				success: true,
				message: 'Success'
			});
		} else {
			throw 'Sales Order does not exist.';
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

exports.close = async (req, res, next) => {
	const { id } = req.params;

	try {
		const salesOrder = await SalesOrder.findOne({
			where: {
				id,
				deleted: {
					[Op.eq]: false
				},
				closed: {
					[Op.eq]: false
				}
			}
		}).catch((e) => {
			throw e;
		});

		if (!salesOrder) throw new Error('Sales Order not found!');

		await salesOrder
			.update({
				closed: true,
				status: 'closed'
			})
			.catch((e) => {
				throw e;
			});

		return res.status(201).send({
			salesOrder,
			success: true,
			message: 'Success'
		});
	} catch (err) {
		console.log(err);
		return res.status(400).send({
			success: false,
			message: 'Failed',
			error: err
		});
	}
};

const insertSalesOrderItems = async (salesOrderItems, salesOrderId, transaction) => {
	// const existingSalesOrderItemIds = await SalesOrderItems.findAll({
	//         where: {
	//             salesOrderId: salesOrderId
	//         },
	//         attributes: ["id"],
	//         raw: true,
	//     })
	//     .catch(error => {
	//         console.log(error)
	//         throw error
	//     })

	for (let i = 0; i < salesOrderItems.length; i++) {
		let item = salesOrderItems[i];
		var inputParams = {
			itemMasterId: item.itemMasterId,
			description: item.description,
			warehouseId: item.warehouseId,
			quantity: item.quantity,
			uomId: item.uomId,
			price: item.price,
			discountPerc: item.discountPerc,
			discount: item.discount,
			priceAfterDiscount: item.priceAfterDiscount,
			taxPerc: item.taxPerc,
			tax: item.tax,
			taxableValue: item.taxableValue,
			total: item.total
		};

		if (item.id) {
			const salesOrderItemObj = await SalesOrderItem.findOne({
				where: {
					id: item.id
				}
			}).catch((error) => {
				console.log(error);
				throw error;
			});

			if (salesOrderItemObj)
				await salesOrderItemObj
					.update(inputParams, {
						transaction
					})
					.catch((error) => {
						console.log(error);
						throw error;
					});
		} else {
			inputParams.salesOrderId = salesOrderId;

			await SalesOrderItem.create(inputParams, {
				transaction
			}).catch((e) => {
				console.log(e);
				throw e;
			});
		}
	}
};

exports.importSalesOrders = async (req, res, next) => {
	let transaction;
	try {
		if (!req.files || !req.files[0]) throw 'Please select an excel file to import!';

		let path = req.files[0].path;
		let processedErrors = [],
			createdSalesOrders = [],
			salesOrder = {},
			lineItems = [];

		var workbook = xlsx.readFile(path);
		var sheetNames = workbook.SheetNames;
		var xlData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNames[0]]);

		if (!xlData.length) throw 'No data found to import!';
		if (!xlData[0]['Vch No']) throw 'No data found to import!';

		for (let i = 0; i < xlData.length; i++) {
			const item = xlData[i];

			// Checks whether tally voucher number already exists
			const voucherExists = await checkTallyVoucherNoExists(item['Vch No']);

			if (voucherExists) {
				processedErrors.push({
					message: `Voucher Number ${item['Vch No']} already exists.`,
					lineNum: i + 1,
					voucherNo: item['Vch No']
				});

				salesOrder = {};
				continue;
			}

			// Validates the branch
			const branchName = item['Branch Name'];
			let branchId = await getBranch(branchName);

			if (!branchId) {
				processedErrors.push({
					message: `Branch not found for Voucher Number ${item['Vch No']}.`,
					lineNum: i + 1,
					voucherNo: item['Vch No']
				});

				salesOrder = {};
				continue;
			}

			// Finds whether one sales order is finished in the excel file
			if (salesOrder.tallyVoucherNumber && salesOrder.tallyVoucherNumber !== item['Vch No']) {
				console.log('###################### Next Voucher No encountered #######################');
				await excelImportInsertPhase(req, salesOrder, lineItems, createdSalesOrders, branchName, transaction);

				salesOrder = {};
				lineItems = [];
			}

			if (!salesOrder.tallyVoucherNumber) {
				console.log('###################### First Time #######################');

				await setSalesOrderHeaderItems(item, salesOrder, branchId);

				await allocateLineItems(item, lineItems, branchId);
			} else if (salesOrder.tallyVoucherNumber == item['Vch No']) {
				console.log('###################### tallyVoucherNumber is there #######################');
				await allocateLineItems(item, lineItems, branchId);
			}

			if (i === xlData.length - 1) {
				console.log('###################### Last loop #######################');

				await excelImportInsertPhase(req, salesOrder, lineItems, createdSalesOrders, branchName, transaction);

				salesOrder = {};
				lineItems = [];
			}
		}

		res.send({
			success: true,
			createdSalesOrders,
			errors: processedErrors
		});
	} catch (error) {
		// Rollback transaction only if the transaction object is defined
		console.log(error);
		if (transaction) await transaction.rollback();

		return res.status(400).send({
			success: false,
			message: error.message || error,
			error: error.message || error
		});
	}
};

const checkTallyVoucherNoExists = async (voucherNo) => {
	console.log('################################## checkTallyVoucherNoExists ###################################');
	const salesOrder = await SalesOrder.findOne({
		where: {
			tallyVoucherNumber: voucherNo
		}
	}).catch((e) => {
		throw e;
	});

	if (salesOrder) return true;
	else return false;
};

const setSalesOrderHeaderItems = async (item, salesOrder, branchId) => {
	salesOrder.tallyVoucherNumber = item['Vch No'];
	salesOrder.docDate = salesOrder.postingDate = await excelDateToDate(item['Vch Date']);
	salesOrder.branchId = branchId;
	salesOrder.businessPartnerId = await getCustomer(item['Customer Name']);
	salesOrder.remarks = item['Remarks'];
};

const allocateLineItems = async (item, lineItems, branchId) => {
	console.log('############################### allocateLineItems ##############################');

	try {
		if (item['Item Name']) {
			let uomId = await getUOM(item['Unit']);
			let productId = await getProduct(item['Item Code'], item['Item Name'], uomId);
			let warehouseId = await getWarehouse(item['Godwon Name'], branchId);

			lineItems.push({
				itemMasterId: productId,
				warehouseId,
				quantity: item['Quantity'],
				openQty: item['Quantity'],
				uomId,
				price: item['Price'],
				discountPerc: item['Discount %'] || 0,
				discount: item['Discount Amt'] || 0,
				otherAmountPerc: item['Other Ledgers %'],
				otherAmount: item['Other Amount'],
				total: item['Total Amount']
			});
		}
	} catch (error) {
		throw error;
	}
};

const getBranch = async (name) => {
	console.log('######################################getBranch###########################################');
	const branch = await Branch.findOne({
		where: {
			name
		}
	}).catch((e) => {
		throw e;
	});

	if (branch) return branch.id;
	else return 0;
};

const getCustomer = async (name) => {
	let businessPartner = await BusinessPartner.findOne({
		where: {
			name,
			type: 'customer'
		}
	}).catch((e) => {
		throw e;
	});

	if (!businessPartner) {
		businessPartner = await BusinessPartner.create({
			name,
			type: 'customer'
		}).catch((e) => {
			throw e;
		});

		return businessPartner.id;
	} else return businessPartner.id;
};

const getProduct = async (code, name, uomId) => {
	let product = await ItemMaster.findOne({
		where: {
			code
		}
	}).catch((e) => {
		throw e;
	});

	if (!product) {
		product = await ItemMaster.create({
			code,
			name,
			categoryId: 4,
			departmentId: 1,
			managementTypeId: 2,
			makeBuy: 'make',
			valuationMethod: 'm',
			inventoryUOMId: uomId,
			consumptionTypeId: 1,
			typeId: 3
		}).catch((e) => {
			throw e;
		});

		return product.id;
	} else {
		// Check whether the UOM is assigned to the item master
		if (product.inventoryUOMId !== uomId) {
			const itemMasterUOM = await ItemMasterUOMs.findOne({
				where: {
					uomId,
					itemMasterId: product.id
				}
			}).catch((e) => {
				throw e;
			});

			if (!itemMasterUOM) throw new Error(`UOM is not assigned to the product ${name}`);
		}

		return product.id;
	}
};

const getUOM = async (code) => {
	let uom = await UOM.findOne({
		where: Sequelize.where(Sequelize.fn('lower', Sequelize.col('code')), Sequelize.fn('lower', code))
	}).catch((e) => {
		throw e;
	});

	if (!uom) {
		// uom = await UOM.create({
		//     code,
		//     name: code,
		//     unitFormat: code,
		// }).catch(e => {
		//     throw e
		// })

		// return uom.id
		throw new Error(`UOM not found for ${code}`);
	} else return uom.id;
};

const getWarehouse = async (name, branchId) => {
	let warehouse = await Warehouse.findOne({
		where: {
			name
		}
	}).catch((e) => {
		throw e;
	});

	if (!warehouse) {
		warehouse = await Warehouse.create({
			name,
			code: name,
			branchId
		}).catch((e) => {
			throw e;
		});

		return warehouse.id;
	} else return warehouse.id;
};

const excelImportInsertPhase = async (req, salesOrder, lineItems, createdSalesOrders, branchName, transaction) => {
	console.log('###################### excel Import Insert Phase #######################');

	// Insert the Sales Order
	transaction = await db.sequelize.transaction().catch((e) => {
		console.log(e);
		throw e;
	});

	let lineItemsTotal = lineItems.map((lineItem) => +lineItem.total).reduce((a, b) => a + b, 0);

	salesOrder.grandTotal = lineItemsTotal;
	salesOrder.SalesOrderItems = lineItems;

	await insertSalesOrderFromExcel(req, salesOrder, createdSalesOrders, branchName, transaction);
};

const insertSalesOrderFromExcel = async (req, salesOrder, createdSalesOrders, branchName, transaction) => {
	if (req.headers.user) salesOrder.createdUser = req.headers.user;

	let include = [
		{
			model: SalesOrderItem,
			required: true
		}
	];

	const series = await getDocumentSeries(branchName);

	const nextDocNo = await helper.getNextDocumentNumber('SOR', series);

	if (nextDocNo) salesOrder.docNum = nextDocNo.nextNumber;

	salesOrder.series = series;
	salesOrder.status = 'open';

	let month = moment(salesOrder.docDate).month() + 1;
	let year = moment(salesOrder.docDate).year();
	let quarter = moment(salesOrder.docDate).quarter();

	salesOrder.month = month;
	salesOrder.year = year;
	salesOrder.quarter = quarter;

	const newSalesOrder = await SalesOrder.create(salesOrder, {
		include,
		transaction
	}).catch((e) => {
		console.log(e);
		throw e;
	});

	createdSalesOrders.push({
		series: salesOrder.series,
		docNum: newSalesOrder.docNum,
		docDate: salesOrder.docDate,
		grandTotal: salesOrder.grandTotal
	});

	await transaction.commit();
};

const getDocumentSeries = async (branch) => {
	switch (branch) {
		case 'Street 12':
			return 'BRST12';
		case 'Street 15':
			return 'BRST15';
		case 'Street 38':
			return 'BRST38';
		default:
			break;
	}
};

const excelDateToDate = (date) => {
	return new Date(Math.round((date - 25569) * 86400 * 1000));
};

exports.getOne = async (req, res, next) => {
	const { id } = req.params;

	var include = [
		{
			model: SalesOrderItem,
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
			model: Branch
		},
		{
			model: Currency
		},
		{
			model: BusinessPartner
		}
	];

	await SalesOrder.findOne({
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
				salesOrder: result,
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

	const salesOrder = await SalesOrder.findOne({
		where: {
			id: id
		}
	}).catch((error) => {
		console.log(error);
		throw error;
	});

	if (!salesOrder) {
		return res.status(404).send({
			message: 'record Not Found',
			success: false
		});
	}

	await salesOrder
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

exports.getProductionPlan = async (req, res, next) => {
	let productionPlans = [],
		createdProductions = [];

	purchasePlans = [];

	try {
		const { salesOrders } = req.body;

		for (let i = 0; i < salesOrders.length; i++) {
			const salesOrder = await SalesOrder.findOne({
				include: [
					{
						model: SalesOrderItem,
						include: {
							model: UOM
						}
					}
				],
				where: {
					id: salesOrders[i].id,
					status: 'open',
					deleted: false
				}
			}).catch((e) => {
				console.log(e);
				throw e;
			});

			if (salesOrder && salesOrder.SalesOrderItems && salesOrder.SalesOrderItems.length > 0) {
				for (let j = 0; j < salesOrder.SalesOrderItems.length; j++) {
					let item = salesOrder.SalesOrderItems[j];
					let fromBillOfMaterial = false;

					const itemMaster = await ItemMaster.findOne({
						where: {
							id: item.itemMasterId
						},
						include: {
							model: UOM,
							attributes: [ 'code', 'name' ],
							as: 'InventoryUOM'
						}
					}).catch((e) => {
						console.log(e);
						throw e;
					});

					let requiredQty = await helper.getConvertedQuantity(item.uomId, item.itemMasterId, item.quantity);

					//Calculate available quantity
					const warehouseItems = await WarehouseItems.findAll({
						where: {
							itemMasterId: item.itemMasterId,
							isDamage: false,
							onHand: {
								[Op.gt]: 0
							}
						},
						attributes: [ 'onHand', 'commited', 'onOrder' ],
						raw: true
					}).catch((error) => {
						throw error;
					});

					let totalQuantity = 0;
					warehouseItems.map((warehouseItem) => {
						totalQuantity +=
							(+warehouseItem.onHand || 0) -
							(+warehouseItem.committed || 0) +
							(+warehouseItem.onOrder || 0);
					});

					console.log('###################################################################');
					console.log('requiredQty ', requiredQty);
					console.log('totalQuantity ', totalQuantity);
					console.log('###################################################################');

					if (requiredQty > totalQuantity) {
						let neededQty = requiredQty - totalQuantity;

						if (itemMaster.makeBuy == 'make') {
							await generateProductionPlan(
								neededQty,
								item.itemMasterId,
								parseFloat(requiredQty).toFixed(3),
								parseFloat(totalQuantity).toFixed(3),
								null,
								productionPlans,
								createdProductions,
								fromBillOfMaterial,
								item.salesOrderId,
								item.id,
								item.warehouseId,
								itemMaster.inventoryUOMId
							);
						} else if (itemMaster.makeBuy == 'buy') {
							let purchaseParams = {
								itemMaster: itemMaster.name,
								salesOrder: salesOrder.series + ' ' + salesOrder.docNum,
								salesOrderId: salesOrder.id,
								salesOrderItemId: item.id,
								itemMasterId: item.itemMasterId,
								quantity: parseFloat(neededQty).toFixed(3),
								uomId: itemMaster.inventoryUOMId,
								showToUser: true,
								uom: itemMaster.InventoryUOM.name
							};

							purchasePlans.push(purchaseParams);
						}
					}
				}
			}
		}

		return res.status(200).send({
			productionPlans: productionPlans,
			purchasePlans: purchasePlans,
			salesOrders: salesOrders,
			success: true,
			message: 'Success'
		});
	} catch (err) {
		console.log(err);
		return res.status(400).send({
			success: false,
			message: 'Failed',
			error: err
		});
	}
};

exports.ItemList = async (req, res, next) => {
	var filter = [];
	var include = [
		{
			model: UOM
		}
	];

	if (req.query.itemMaster) {
		include.push({
			model: ItemMaster,
			where: {
				name: {
					[Op.iLike]: `%${req.query.itemMaster}%`
				}
			}
		});
	} else
		include.push({
			model: ItemMaster
		});

	if (req.query.salesOrder) {
		include.push({
			model: SalesOrder,
			where: {
				docNum: {
					[Op.iLike]: `%${req.query.salesOrder}%`
				},
				deleted: false
			}
		});
	} else
		include.push({
			model: SalesOrder,
			where: {
				deleted: false
			}
		});

	// if (req.query.status && req.query.status == "planned") {
	//     filter.push({
	//         statusId: status.planned,
	//     })
	// }

	// filter.push({
	//     deleted: false
	// })

	await SalesOrderItem.findAll({
		include: include,
		distinct: true,
		where: filter,
		order: [ [ 'id', 'ASC' ] ]
	})
		.then(async (results) => {
			return res.send({
				salesOrderItems: results
			});
		})
		.catch((error) => {
			return res.status(400).send({
				error: error
			});
		});
};

exports.createProductionOrders = async (req, res, next) => {
	let { productionPlans } = req.body;

	let { purchasePlans } = req.body;

	let { salesOrders } = req.body;

	let transaction;

	try {
		transaction = await db.sequelize.transaction().catch((e) => {
			console.log(e);
			throw e;
		});

		let missingBillOfMaterials = [];

		const salesOrderPlan = await createSalesOrderPlan(productionPlans, purchasePlans, salesOrders, transaction);

		if (salesOrderPlan && salesOrderPlan.id) {
			await generateProductionOrders(productionPlans, missingBillOfMaterials, salesOrderPlan.id, transaction);

			if (purchasePlans && purchasePlans.length > 0)
				await generatePurchases(purchasePlans, salesOrderPlan.id, transaction);

			if (salesOrders && salesOrders.length > 0)
				await updateSalesOrderStatusAfterProductionGeneraion(salesOrders, transaction);
		} else throw 'Failed creating Sales Order Plan';

		await transaction.commit();
		return res.status(200).send({
			success: true,
			message: 'Success',
			missingBillOfMaterials: missingBillOfMaterials
		});
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

const generateProductionPlan = async (
	productionQty,
	itemMasterId,
	requiredQty,
	totalQuantity,
	dueDate,
	productionPlans,
	createdProductions,
	fromBillOfMaterial,
	salesOrderId,
	salesOrderItemId,
	warehouseId,
	uomId
) => {
	const itemMaster = await ItemMaster.findOne({
		where: {
			id: itemMasterId
		},
		include: {
			model: UOM,
			as: 'InventoryUOM'
		}
	}).catch((e) => {
		console.log(e);
		throw e;
	});

	if (!itemMaster) return;

	const uom = await UOM.findOne({
		where: {
			id: uomId
		}
	}).catch((e) => {
		console.log(e);
		throw e;
	});

	const productionParams = {
		itemMasterId: itemMasterId,
		itemMasterCode: itemMaster.code,
		itemMasterName: itemMaster.name,
		warehouseId: warehouseId,
		requiredQty: parseFloat(requiredQty).toFixed(3),
		availableQty: parseFloat(totalQuantity).toFixed(3),
		productionQty: parseFloat(productionQty).toFixed(3),
		uom: uom.name,
		dueDate: dueDate,
		salesOrders: [
			{
				id: salesOrderId
			}
		],
		salesOrderItems: salesOrderItemId ? [ salesOrderItemId ] : []
	};

	if (createdProductions.indexOf(itemMasterId) !== -1 && fromBillOfMaterial) {
		console.log('Duplicate items found in production order!!!');
		return;
	}

	productionParams.showToUser = true;

	if (productionPlans && productionPlans.length > 0) {
		let itemExist = false;
		for (let i = 0; i < productionPlans.length; i++) {
			let productionPlan = productionPlans[i];

			if (productionPlan.itemMasterId && +productionPlan.itemMasterId === +itemMasterId) {
				// Item master already exist
				itemExist = true;
				productionPlan.requiredQty = (+productionPlan.requiredQty + +requiredQty).toFixed(3);
				productionPlan.productionQty = (+productionPlan.productionQty + +productionQty).toFixed(3);
				productionPlan.salesOrders.push({
					id: salesOrderId
				});

				if (salesOrderItemId) productionPlan.salesOrderItems.push(salesOrderItemId);
			}
		}

		if (!itemExist && itemMaster.makeBuy == 'make') {
			productionPlans.push(productionParams);
			createdProductions.push(+itemMasterId);
		}
	} else {
		if (itemMaster.makeBuy == 'make') {
			productionPlans.push(productionParams);
			createdProductions.push(+itemMasterId);
		}
	}

	const billOfMaterial = await BillOfMaterial.findOne({
		where: {
			productId: itemMasterId
		},
		include: [
			{
				model: BOMComponent,
				include: {
					model: UOM
				}
			}
		]
	}).catch((e) => {
		console.log(e);
		throw e;
	});

	//Loop through BOM Components and check whether stock is available
	if (billOfMaterial && billOfMaterial.BOMComponents && billOfMaterial.BOMComponents.length > 0) {
		fromBillOfMaterial = true;

		for (let i = 0; i < billOfMaterial.BOMComponents.length; i++) {
			let bomComponent = billOfMaterial.BOMComponents[i];

			//Get conversion factor for converting component quantity to base unit
			const itemMasterUOM = await ItemMasterUOMs.findOne({
				where: {
					itemMasterId: itemMaster.id,
					uomId: billOfMaterial.uomId
				}
			}).catch((error) => {
				throw error;
			});

			let quantityPerBaseUnit = +bomComponent.quantityPerUnit;

			if (itemMasterUOM)
				quantityPerBaseUnit = (+bomComponent.quantityPerUnit / +itemMasterUOM.conversionFactor).toFixed(4);

			let requiredQty = quantityPerBaseUnit * +productionQty;

			//Calculate available quantity
			const warehouseItems = await WarehouseItems.findAll({
				where: {
					itemMasterId: bomComponent.productId,
					isDamage: false,
					onHand: {
						[Op.gt]: 0
					}
				},
				attributes: [ 'onHand', 'commited', 'onOrder' ],
				raw: true
			}).catch((error) => {
				throw error;
			});

			let totalQuantity = 0;
			warehouseItems.map((warehouseItem) => {
				totalQuantity +=
					(+warehouseItem.onHand || 0) - (+warehouseItem.committed || 0) + (+warehouseItem.onOrder || 0);
			});

			if (requiredQty > totalQuantity) {
				let neededQty = requiredQty - totalQuantity;

				if (itemMaster.makeBuy == 'make') {
					console.log('generateProductionPlan From BillOfMaterials');
					// Recursively invoking the function
					await generateProductionPlan(
						neededQty,
						+bomComponent.productId,
						parseFloat(requiredQty).toFixed(3),
						parseFloat(totalQuantity).toFixed(3),
						dueDate,
						productionPlans,
						createdProductions,
						fromBillOfMaterial,
						salesOrderId,
						salesOrderItemId,
						bomComponent.warehouseId,
						bomComponent.uomId
					);
				}
			}
		}
	} else {
		console.log('########################## purchasePlansFromBillofMaterials ##########################');
		const salesOrder = await SalesOrder.findOne({
			where: {
				id: salesOrderId
			}
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		const salesOrderItem = await SalesOrderItem.findOne({
			where: {
				id: salesOrderItemId
			},
			include: {
				model: UOM
			}
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		let purchaseParams = {
			itemMaster: itemMaster.name,
			salesOrder: salesOrder && salesOrder.id ? salesOrder.series + ' ' + salesOrder.docNum : null,
			salesOrderId: salesOrderId,
			salesOrderItemId: salesOrderItem.id,
			itemMasterId: itemMaster.id,
			quantity: parseFloat(productionQty).toFixed(3),
			uomId: salesOrderItem.uomId,
			// uom: uom.name,
			uom: itemMaster.InventoryUOM.name
		};
		purchaseParams.showToUser = true;

		if (itemMaster.makeBuy == 'buy') purchasePlans.push(purchaseParams);
	}
};

const createSalesOrderPlan = async (productionPlans, purchasePlans, salesOrders, transaction) => {
	const nextDocNo = await helper.getNextDocumentNumber('SOP', 'BRST15');

	try {
		let params = {
			docNum: nextDocNo.nextNumber,
			series: 'BRST15',
			docDate: Date.now(),
			branchId: null,
			salesOrders: salesOrders
		};

		let salesOrderPlanProductions = [];
		productionPlans.forEach((item) => {
			if (item.itemMasterId) {
				salesOrderPlanProductions.push({
					itemMasterId: item.itemMasterId,
					warehouseId: item.warehouseId,
					requiredQty: item.requiredQty,
					availableQty: item.availableQty,
					productionQty: item.productionQty
				});
			}
		});

		let salesOrderPlanPurchases = [];
		purchasePlans.forEach((item) => {
			if (item.itemMasterId) {
				salesOrderPlanPurchases.push({
					salesOrderId: item.salesOrderId,
					salesOrderItemId: item.salesOrderItemId,
					itemMasterId: item.itemMasterId,
					uomId: item.uomId,
					quantity: item.quantity
				});
			}
		});

		params = {
			...params,
			SalesOrderPlanProductions: salesOrderPlanProductions,
			SalesOrderPlanPurchases: salesOrderPlanPurchases
		};

		var include = [
			{
				model: SalesOrderPlanProductions
			},
			{
				model: SalesOrderPlanPurchases
			}
		];

		const salesOrderPlan = await SalesOrderPlan.create(params, {
			include: include,
			transaction: transaction
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		return salesOrderPlan;
	} catch (error) {
		throw error;
	}
};

const generateProductionOrders = async (productionPlans, missingBillOfMaterials, salesOrderPlanId, transaction) => {
	for (let j = 0; j < productionPlans.length; j++) {
		let productionPlan = productionPlans[j];
		let productionQty = productionPlan.productionQty;
		const nextDocNo = await helper.getNextDocumentNumber('POR', 'BRST12');

		const bom = await BillOfMaterial.findOne({
			where: {
				productId: productionPlan.itemMasterId
			},
			include: [
				{
					model: BOMComponent
				},
				{
					model: BOMLabour
				},
				{
					model: BOMMachine
				}
			]
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		const itemMaster = await ItemMaster.findOne({
			where: {
				id: productionPlan.itemMasterId
			}
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		if (!bom) throw new Error(`Bill of Materials missing for item ${itemMaster.name}`);

		if (itemMaster.inventoryUOMId != bom.uomId) {
			const itemMasterUom = await ItemMasterUOMs.findOne({
				where: {
					itemMasterId: itemMaster.id,
					uomId: bom.uomId
				}
			}).catch((e) => {
				console.log(e);
				throw e;
			});

			if (itemMasterUom) {
				productionQty = (productionQty / itemMasterUom.conversionFactor).toFixed(3);
			}
		}

		let month = moment().month() + 1;
		let year = moment().year();
		let quarter = moment().quarter();

		let params = {
			docNum: nextDocNo.nextNumber,
			series: 'BRST12',
			docDate: moment.now(),
			productId: productionPlan.itemMasterId,
			salesOrderId: productionPlan.salesOrderId,
			dueDate: moment.now(),
			startDate: moment.now(),
			plannedQuantity: productionQty,
			uomId: bom.uomId,
			statusId: status.planned,
			salesOrders: productionPlan.salesOrders,
			warehouseId: productionPlan.warehouseId,
			salesOrderPlanId: salesOrderPlanId,
			month: month,
			year: year,
			quarter: quarter,
			productionUnitId: bom.productionUnitId || null
		};

		let productionOrderComponents = [];
		let plannedTotalCost = 0;

		if (bom && bom.id) {
			if (bom && bom.id && bom.BOMComponents && bom.BOMComponents.length > 0) {
				for (let i = 0; i < bom.BOMComponents.length; i++) {
					let component = bom.BOMComponents[i];
					let quantity = +component.quantityPerUnit * +productionQty;
					const totalCost = +component.cost * +quantity;

					productionOrderComponents.push({
						productId: component.productId,
						quantityPerUnit: component.quantityPerUnit,
						totalQuantity: quantity,
						unitCost: component.cost,
						totalCost: totalCost,
						warehouseId: component.warehouseId,
						uomId: component.uomId
					});

					plannedTotalCost += totalCost;
				}
			}

			let productionOrderMachines = [];
			if (bom && bom.id && bom.BOMMachines && bom.BOMMachines.length > 0) {
				for (let i = 0; i < bom.BOMMachines.length; i++) {
					let machine = bom.BOMMachines[i];
					const totalTime = +machine.estimatedTime * productionQty;
					const totalCost = +totalTime * +machine.cost;

					productionOrderMachines.push({
						machineId: machine.machineId,
						estimatedTime: machine.estimatedTime,
						costPerHour: machine.cost,
						unitCost: machine.cost,
						routingStageNumber: machine.routingStageNumber,
						routingStageId: machine.routingStageId,
						totalTime: totalTime,
						totalCost: totalCost
					});

					plannedTotalCost += totalCost;
				}
			}

			let productionOrderLabours = [];
			if (bom && bom.id && bom.BOMLabours && bom.BOMLabours.length > 0) {
				for (let i = 0; i < bom.BOMLabours.length; i++) {
					let labour = bom.BOMLabours[i];
					const totalTime = +labour.estimatedTime * +productionQty;
					const totalCost = +totalTime * +labour.cost;

					productionOrderLabours.push({
						employeeId: labour.employeeId,
						estimatedTime: labour.estimatedTime,
						costPerHour: labour.cost,
						unitCost: labour.cost,
						totalTime: totalTime,
						totalCost: totalCost
					});

					plannedTotalCost += totalCost;
				}
			}

			params.totalCost = plannedTotalCost;
			params.unitCost = plannedTotalCost / productionQty;

			params = {
				...params,
				ProductionOrderComponents: productionOrderComponents,
				ProductionOrderMachines: productionOrderMachines,
				ProductionOrderLabours: productionOrderLabours
			};

			var include = [
				{
					model: ProductionOrderComponents,
					required: true
				},
				{
					model: ProductionOrderMachines,
					required: true
				},
				{
					model: ProductionOrderLabours,
					required: true
				}
			];

			await ProductionOrder.create(params, {
				include: include,
				transaction: transaction
			}).catch((e) => {
				console.log(e);
				throw e;
			});
		} else {
			missingBillOfMaterials.push(itemMaster.name);
		}
	}
};

const generatePurchases = async (purchasePlans, salesOrderPlanId, transaction) => {
	for (let j = 0; j < purchasePlans.length; j++) {
		let purchasePlan = purchasePlans[j];

		let params = {
			salesOrderId: purchasePlan.salesOrderId,
			salesOrderItemId: purchasePlan.salesOrderItemId,
			itemMasterId: purchasePlan.itemMasterId,
			quantity: purchasePlan.quantity,
			uomId: purchasePlan.uomId,
			salesOrderPlanId: salesOrderPlanId
		};

		await PurchasePlan.create(params, {
			transaction: transaction
		}).catch((e) => {
			console.log(e);
			throw e;
		});
	}
};

const updateSalesOrderStatusAfterProductionGeneraion = async (salesOrders, transaction) => {
	for (let j = 0; j < salesOrders.length; j++) {
		let salesOrder = salesOrders[j];

		await SalesOrder.update(
			{
				status: 'Production Generated'
			},
			{
				where: {
					id: salesOrder.id
				}
			},
			{
				transaction
			}
		).catch((e) => {
			console.log(e);
			throw e;
		});
	}
};

const getFulfillmentData = async (salesOrderItems, salesOrderCount, totalRequiredQty, totalAvailableQty) => {
	for (let j = 0; j < salesOrderItems.length; j++) {
		const salesOrderItem = salesOrderItems[j];

		const itemMasterId = salesOrderItem.itemMasterId;
		let requiredQty = salesOrderItem.quantity;

		//Calculating the total required quantity
		const uomConversionFactor = await ItemMasterUOMs.findOne({
			where: {
				itemMasterId: itemMasterId,
				uomId: salesOrderItem.uomId
			},
			attributes: [ 'conversionFactor' ],
			raw: true
		}).catch((error) => {
			return res.status(400).send({
				error: error
			});
		});

		if (uomConversionFactor && uomConversionFactor.conversionFactor)
			requiredQty = requiredQty * uomConversionFactor.conversionFactor;

		totalRequiredQty += requiredQty;

		//Calculate available quantity
		const warehouseItems = await WarehouseItems.findAll({
			where: {
				itemMasterId: itemMasterId,
				isDamage: false,
				onHand: {
					[Op.gt]: 0
				}
			},
			attributes: [ 'onHand', 'commited' ],
			raw: true
		}).catch((error) => {
			return res.status(400).send({
				error: error
			});
		});

		let availableQty = 0;

		warehouseItems.map((warehouseItem) => {
			availableQty += (+warehouseItem.onHand || 0) - (+warehouseItem.committed || 0);
		});

		totalAvailableQty += availableQty;

		console.log('new totalAvailableQty', totalAvailableQty);

		if (j === salesOrderItems.length - 1) salesOrderCount--;
	}
};

const GoogleSpreadsheet = require('google-spreadsheet');
exports.importSalesOrdersFromGoogleDrive = async (req, res) => {
	try {
		const scopes = [ 'https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets' ];

		const auth = new google.auth.JWT(googleCredentials.client_email, null, googleCredentials.private_key, scopes);

		const drive = google.drive({
			version: 'v3',
			auth
		});

		let response = await new Promise((resolve, reject) => {
			drive.files.list(
				{
					pageSize: 5,
					// fields: 'files(name, webViewLink)',
					fields: 'nextPageToken, files(id, name, fileExtension)',
					// fields: '*',
					orderBy: 'createdTime desc'
				},
				function(err, res) {
					if (err) {
						reject(err);
					}
					resolve(res);
				}
			);
		});

		let data = 'Name,URL\n';

		// response.data.files.map(entry => {
		//     const {
		//         name,
		//         webViewLink
		//     } = entry;
		//     data += `${name},${webViewLink}\n`;
		// });

		console.log('data', response.data.files);

		const sheets = google.sheets({
			version: 'v4',
			auth
		});

		sheets.spreadsheets.values.get(
			{
				spreadsheetId: response.data.files[0].id,
				range: 'Class Data!A2:E'
			},
			(err, res) => {
				if (err) return console.log('The API returned an error: ' + err);

				const rows = res.data.values;

				if (rows.length) {
					console.log('Name, Major:');
					// Print columns A and E, which correspond to indices 0 and 4.
					rows.map((row) => {
						console.log(`${row[0]}, ${row[4]}`);
					});
				} else {
					console.log('No data found.');
				}
			}
		);

		// const doc = new GoogleSpreadsheet(response.data.files[0].id)

		// var workbook = xlsx.readFile("https://drive.google.com/file/d/1BWklSkXuRTZUrx27q7rbtMxrHsawTDnk/view?usp=drivesdk")
		// var sheetNames = workbook.SheetNames
		// var xlData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNames[0]])

		// console.log("workbook", workbook);
	} catch (error) {
		console.log(error);
		throw error;
	}
};
