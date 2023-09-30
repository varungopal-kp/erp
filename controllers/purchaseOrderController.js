const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const xlsx = require('xlsx');
const { google } = require('googleapis');

const db = require('../models/index');
const PurchaseOrder = require('../models').PurchaseOrder;
const PurchaseOrderItem = require('../models').PurchaseOrderItem;
const ItemMaster = require('../models').ItemMaster;
const UOM = require('../models').UOM;
const Warehouse = require('../models').Warehouse;
const Branch = require('../models').Branch;
const Currency = require('../models').Currency;

const BusinessPartner = require('../models').BusinessPartner;
const ItemMasterUOMs = require('../models').ItemMasterUOMs;
const WarehouseItems = require('../models').WarehouseItems;
const _ = require('lodash');
const moment = require('moment');
const paginate = require('express-paginate');
const helper = require('../helpers/helper');
const status = require('../config/status');

exports.list = async (req, res, next) => {
	var filter = [];
	var include = [
		{
			model: Branch,
			attributes: [ 'code', 'name' ]
		},
		{
			model: Currency,
			attributes: [ 'code' ]
		},
		{
			model: BusinessPartner,
			attributes: [ 'code', 'name' ]
		}
	];

	if (req.query.hasOwnProperty('all')) {
		return res.send({
			purchaseOrders: await PurchaseOrder.findAll({
				include: include,
				where: {
					deleted: {
						[Op.eq]: false
					}
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

	if (req.query.status && req.query.status == 'planned') {
		filter.push({
			statusId: status.planned
		});
	}

	filter.push({
		deleted: false
	});

	await PurchaseOrder.findAndCountAll({
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
				purchaseOrders: results.rows,
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

exports.openPurchaseOrders = async (req, res, next) => {
	var include = [
		{
			model: PurchaseOrderItem,
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

	let purchaseOrders = await PurchaseOrder.findAll({
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

	if (purchaseOrders && purchaseOrders.length > 0) {
		let completeFlag = 0;
		let totalAvailableQty = 0,
			consumedQty = [];

		for (let i = 0; i < purchaseOrders.length; i++) {
			let purchaseOrder = purchaseOrders[i];
			let purchaseOrderItems = purchaseOrders[i].PurchaseOrderItems;
			let totalPendingQty = 0,
				totalRequiredQty = 0;

			if (purchaseOrderItems && purchaseOrderItems.length > 0) {
				let purchaseOrderItemsCount = purchaseOrderItems.length;

				for (let j = 0; j < purchaseOrderItems.length; j++) {
					const purchaseOrderItem = purchaseOrderItems[j];

					const itemMasterId = purchaseOrderItem.itemMasterId;

					let requiredQty = await helper.getConvertedQuantity(
						purchaseOrderItem.uomId,
						itemMasterId,
						purchaseOrderItem.quantity
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

					if (requiredQty > updatedAvailableQuantity) {
						totalPendingQty += +requiredQty - updatedAvailableQuantity;
					}

					purchaseOrderItemsCount--;
				}

				if (purchaseOrderItemsCount === 0) {
					let fulFilled = false;

					if (totalPendingQty === 0 || totalPendingQty < 0) fulFilled = true;

					let fullFillmentPercentage = 100;
					if (totalPendingQty > 0 && totalPendingQty != totalRequiredQty)
						fullFillmentPercentage = Math.round(+totalPendingQty / +totalRequiredQty * 100);
					else if (+totalPendingQty === +totalRequiredQty) {
						fullFillmentPercentage = 0;
					}

					purchaseOrder.setDataValue('totalRequiredQty', totalRequiredQty);
					purchaseOrder.setDataValue('totalAvailableQty', totalAvailableQty);
					purchaseOrder.setDataValue('totalPendingQty', totalPendingQty);

					purchaseOrder.setDataValue('fulFillmentPercentage', fullFillmentPercentage);
					purchaseOrder.setDataValue('fulFilled', fulFilled);
				}
			}
		}

		return res.send({
			purchaseOrders: purchaseOrders,
			success: true
		});
	} else {
		return res.send({
			purchaseOrders: [],
			success: true
		});
	}
};

exports.create = async (req, res, next) => {
	let { purchaseOrder } = req.body;

	if (req.headers.user) purchaseOrder.createdUser = req.headers.user;

	var include = [
		{
			model: PurchaseOrderItem,
			required: true
		}
	];

	let transaction;

	const nextDocNo = await helper.getNextDocumentNumber('POR', purchaseOrder.series);

	if (nextDocNo) purchaseOrder.docNum = nextDocNo.nextNumber;

	purchaseOrder.status = 'open';

	let month = moment(purchaseOrder.docDate).month() + 1;
	let year = moment(purchaseOrder.docDate).year();
	let quarter = moment(purchaseOrder.docDate).quarter();

	purchaseOrder.month = month;
	purchaseOrder.year = year;
	purchaseOrder.quarter = quarter;

	try {
		transaction = await db.sequelize.transaction().catch((e) => {
			console.log(e);
			throw e;
		});

		const newPurchaseOrder = await PurchaseOrder.create(purchaseOrder, {
			include,
			transaction: transaction
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		await transaction.commit();

		return res.status(200).send({
			purchaseOrder: newPurchaseOrder,
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
	let { purchaseOrder } = req.body;

	const { PurchaseOrderItems } = purchaseOrder;

	const purchaseOrderId = req.params.id;

	let transaction = await db.sequelize.transaction().catch((e) => {
		console.log(e);
		throw e;
	});

	try {
		const existingPurchaseOrder = await PurchaseOrder.findOne({
			where: {
				id: purchaseOrderId,
				deleted: {
					[Op.eq]: false
				}
			}
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		await existingPurchaseOrder
			.update(purchaseOrder, {
				transaction
			})
			.catch((e) => {
				console.log(e);
				throw e;
			});

		if (existingPurchaseOrder && existingPurchaseOrder.id) {
			await insertPurchaseOrderItems(PurchaseOrderItems, purchaseOrderId, transaction);

			// commit
			await transaction.commit();

			return res.status(200).send({
				purchaseOrder: existingPurchaseOrder,
				success: true,
				message: 'Success'
			});
		} else {
			throw 'Purchase Order does not exist.';
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
		const purchaseOrder = await PurchaseOrder.findOne({
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

		if (!purchaseOrder) throw new Error('Purchase Order not found!');

		await purchaseOrder
			.update({
				closed: true
			})
			.catch((e) => {
				throw e;
			});

		return res.status(201).send({
			purchaseOrder,
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

const insertPurchaseOrderItems = async (purchaseOrderItems, purchaseOrderId, transaction) => {
	for (let i = 0; i < purchaseOrderItems.length; i++) {
		let item = purchaseOrderItems[i];
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
			const purchaseOrderItemObj = await PurchaseOrderItem.findOne({
				where: {
					id: item.id
				}
			}).catch((error) => {
				console.log(error);
				throw error;
			});

			if (purchaseOrderItemObj)
				await purchaseOrderItemObj
					.update(inputParams, {
						transaction
					})
					.catch((error) => {
						console.log(error);
						throw error;
					});
		} else {
			inputParams.purchaseOrderId = purchaseOrderId;

			await PurchaseOrderItem.create(inputParams, {
				transaction
			}).catch((e) => {
				console.log(e);
				throw e;
			});
		}
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

exports.getOne = async (req, res, next) => {
	const { id } = req.params;

	var include = [
		{
			model: PurchaseOrderItem,
			include: [
				{
					model: ItemMaster,
					attributes: [ 'code', 'name' ]
				},
				{
					model: Warehouse,
					attributes: [ 'code', 'name' ]
				},
				{
					model: UOM,
					attributes: [ 'code', 'name' ]
				}
			]
		},
		{
			model: Branch,
			attributes: [ 'code', 'name' ]
		},
		{
			model: Currency,
			attributes: [ 'code' ]
		},
		{
			model: BusinessPartner,
			attributes: [ 'code', 'name' ]
		}
	];

	await PurchaseOrder.findOne({
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
				purchaseOrder: result,
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

	const purchaseOrder = await PurchaseOrder.findOne({
		where: {
			id: id
		}
	}).catch((error) => {
		console.log(error);
		throw error;
	});

	if (!purchaseOrder) {
		return res.status(404).send({
			message: 'record Not Found',
			success: false
		});
	}

	await purchaseOrder
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
