const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const Moment = require('moment');
const db = require('../models/index');
const ProductionOrder = require('../models').ProductionOrder;
const ProductionUnit = require('../models').ProductionUnit;
const ProductionOrderComponents = require('../models').ProductionOrderComponents;
const ProductionReceipt = require('../models').ProductionReceipt;
const ProductionReceiptItems = require('../models').ProductionReceiptItems;
const ProductionIssue = require('../models').ProductionIssue;
const ProductionIssueItems = require('../models').ProductionIssueItems;
const ItemMaster = require('../models').ItemMaster;
const OIVLBundleNumbers = require('../models').OIVLBundleNumbers;
const WarehouseItem = require('../models').WarehouseItems;
const UOM = require('../models').UOM;
const Warehouse = require('../models').Warehouse;
const OIVL = require('../models').OIVL;
const OIVLBarcodes = require('../models').OIVLBarcodes;
const ProductionReceiptOIVL = require('../models').ProductionReceiptOIVL;
const ProductionOrderBundleNumbers = require('../models').ProductionOrderBundleNumbers;
const ItemMasterUOMs = require('../models').ItemMasterUOMs;
const _ = require('lodash');
const paginate = require('express-paginate');
const helper = require('../helpers/helper');
const status = require('../config/status');
const consumptionTypes = require('../config/consumption-types');

exports.list = async (req, res, next) => {
	var filter = [];
	var include = [
		// {
		//     model: ProductionOrder,
		// },
		{
			model: ProductionReceiptItems,
			include: [
				{
					model: ItemMaster
				},
				{
					model: Warehouse
				},
				{
					model: UOM,
					as: 'receiptUOM'
				},
				{
					model: UOM,
					as: 'rejectionUOM'
				}
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
						[Op.iLike]: `%${data.value}%`
					}
				};
			}
		});
	}

	if (req.query.productionOrder) {
		include.push({
			model: ProductionOrder,
			where: {
				docNum: {
					[Op.iLike]: `%${req.query.productionOrder}%`
				}
			}
		});
	} else {
		include.push({
			model: ProductionOrder
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

	await ProductionReceipt.findAndCountAll({
		// attributes: [
		//     [`concat("ProductionReceipt"."grandTotal", ' hahah')`, 'grandTotal'], "*"
		// ],
		include: include,
		// distinct: true,
		limit: req.query.limit,
		offset: req.skip,
		where: whereCondition,
		order: [ [ 'id', 'DESC' ] ]
	})
		.then(async (results) => {
			const itemCount = results.count;
			const pageCount = Math.ceil(results.count / req.query.limit);

			return res.send({
				productionReceipts: results.rows,
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

exports.create = async (req, res, next) => {
	let { productionReceipt } = req.body;

	if (req.headers.user) productionReceipt.createdUser = req.headers.user;

	var include = [
		{
			model: ProductionReceiptItems,
			required: true
		}
	];

	let transaction;

	const nextDocNo = await helper.getNextDocumentNumber('PRPT', productionReceipt.series);

	if (nextDocNo) productionReceipt.docNum = nextDocNo.nextNumber;

	let month = Moment(productionReceipt.docDate).month() + 1;
	let year = Moment(productionReceipt.docDate).year();
	let quarter = Moment(productionReceipt.docDate).quarter();

	productionReceipt.month = month;
	productionReceipt.year = year;
	productionReceipt.quarter = quarter;

	try {
		transaction = await db.sequelize.transaction().catch((e) => {
			console.log(e);
			throw e;
		});

		// Refine the data with no of bundles
		productionReceipt.ProductionReceiptItems = await refineProductionReceiptItems(
			productionReceipt.ProductionReceiptItems
		);

		const newProductionReceipt = await ProductionReceipt.create(productionReceipt, {
			transaction
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		if (newProductionReceipt && newProductionReceipt.id) {
			const productionOrder = await db.ProductionOrder
				.findOne({
					where: {
						id: newProductionReceipt.productionOrderId
					},
					transaction
				})
				.catch((e) => {
					throw e;
				});

			await updateProductionOrder(
				productionReceipt.productionOrderId,
				status.productReceived,
				productionReceipt.ProductionReceiptItems,
				transaction
			);

			await generateProductionIssues(
				productionReceipt.productionOrderId,
				newProductionReceipt.id,
				productionReceipt.ProductionReceiptItems,
				transaction
			);

			for (let i = 0; i < productionReceipt.ProductionReceiptItems.length; i++) {
				var lineItem = productionReceipt.ProductionReceiptItems[i];

				// await updateOnHandQuantity(lineItem, transaction)

				const productionReceiptItemId = await insertProductionReceiptItem(
					lineItem,
					newProductionReceipt,
					productionOrder,
					transaction
				);

				await addOIVLData(newProductionReceipt, lineItem, productionReceiptItemId, transaction);

				await updateWarehouseItemPrice(lineItem, transaction);

				if (lineItem.rejectionUomId && lineItem.rejectionQuantity && lineItem.rejectionQuantity > 0)
					await updateScrapQuantity(lineItem, productionReceipt.productionOrderId, transaction);
			}
		}

		const message = `${req.user.username ||
			'Unknown user'} received products from the Production Order on ${Moment().format('DD-MM-YYYY hh:mm:ss A')}`;
		await helper.createProductionOrderLog(
			productionReceipt.productionOrderId,
			message,
			req.user.id || null,
			transaction
		);

		await transaction.commit();

		return res.status(200).send({
			productionReceipt: newProductionReceipt,
			success: true,
			message: 'Success'
		});
	} catch (err) {
		// Rollback transaction only if the transaction object is defined
		if (transaction) await transaction.rollback();
		console.log(err);
		return res.status(400).send({
			success: false,
			message: err.message,
			error: err
		});
	}
};

const insertProductionReceiptItem = async (lineItem, productionReceipt, productionOrder, transaction) => {
	console.log('###########################insertProductionReceiptItem###########################');

	lineItem.productionReceiptId = productionReceipt.id;

	const createdItem = await ProductionReceiptItems.create(lineItem, {
		transaction
	}).catch((e) => {
		throw e;
	});

	if (lineItem.productId == productionOrder.productId) {
		await updateDefaultProductReceivedInPOR(
			lineItem.productId,
			lineItem.uomId,
			lineItem.receiptQuantity,
			productionOrder,
			transaction
		);
	}

	return createdItem.id;
};

const updateDefaultProductReceivedInPOR = async (productId, uomId, quantity, productionOrder, transaction) => {
	console.log('###########################updateDefaultProductReceivedInPOR###########################');
	// Update the default product (Considering we can receive different products from a POR) received quantity
	// from different production receipts  against the Production Order so that we can calculate the scrap by
	// taking difference between product received and component issued.

	const itemMaster = await db.ItemMaster
		.findOne({
			where: {
				id: productId
			},
			attributes: [ 'inventoryUOMId' ],
			transaction
		})
		.catch((e) => {
			throw e;
		});

	let quantityInBaseUnit = await helper.getConvertedQuantity(uomId, productId, quantity);
	let defaultProductUOMId = itemMaster.inventoryUOMId;

	const bom = await db.BillOfMaterials
		.findOne({
			where: {
				productId
			},
			include: [
				{
					model: db.BOMComponents,
					where: {
						isDefault: true
					}
				}
			]
		})
		.catch((e) => {
			throw e;
		});

	if (bom && bom.BOMComponents.length && bom.BOMComponents[0]) {
		quantityInBaseUnit = quantity * bom.BOMComponents[0].estimatedQuantity;
		defaultProductUOMId = bom.BOMComponents[0].uomId;
	}

	await productionOrder
		.update(
			{
				defaultProductReceived: +productionOrder.defaultProductReceived + +quantityInBaseUnit,
				defaultProductUOMId
			},
			{
				transaction
			}
		)
		.catch((e) => {
			throw e;
		});
};

exports.update = async (req, res, next) => {
	let { productionReceipt } = req.body;

	const { ProductionReceiptItems } = productionReceipt;

	const productionReceiptId = req.params.id;

	delete productionReceipt['docNum'];

	let transaction = await db.sequelize.transaction().catch((e) => {
		console.log(e);
		throw e;
	});

	try {
		const existingProductionReceipt = await ProductionReceipt.findOne({
			where: {
				id: productionReceiptId
			}
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		await existingProductionReceipt
			.update(productionReceipt, {
				transaction
			})
			.catch((e) => {
				console.log(e);
				throw e;
			});

		if (existingProductionReceipt && existingProductionReceipt.id) {
			await deleteOIVLs(existingProductionReceipt, transaction);

			await deleteProductionReceiptOIVLs(existingProductionReceipt.id, transaction);

			await updateWarehouseItemsOnDelete(existingProductionReceipt.id, transaction);

			await insertProductionReceiptItems(
				ProductionReceiptItems,
				productionReceiptId,
				transaction,
				existingProductionReceipt
			);
		} else {
			return res.status(404).send({
				success: false,
				message: 'Production Order does not exist.'
			});
		}

		// commit
		await transaction.commit();

		return res.status(200).send({
			productionReceipt: existingProductionReceipt,
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

exports.getOne = async (req, res, next) => {
	const { id } = req.params;

	var include = [
		{
			model: ProductionOrder
		},
		{
			model: ProductionReceiptItems,
			include: [
				{
					model: ItemMaster
				},
				{
					model: Warehouse
				},
				{
					model: UOM,
					as: 'receiptUOM'
				},
				{
					model: UOM,
					as: 'rejectionUOM'
				}
			]
		}
	];

	await ProductionReceipt.findOne({
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
				productionReceipt: result,
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

	const productionReceipt = await ProductionReceipt.findOne({
		where: {
			id,
			deleted: false
		}
	}).catch((error) => {
		console.log(error);
		throw error;
	});

	if (!productionReceipt) {
		return res.status(404).send({
			message: 'record Not Found',
			success: false
		});
	}

	const productionOrderId = productionReceipt.productionOrderId;

	let transaction = await db.sequelize.transaction().catch((e) => {
		console.log(e);
		throw e;
	});

	try {
		await productionReceipt
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

		await deleteOIVLs(productionReceipt, transaction);

		await deleteProductionReceiptOIVLs(id, transaction);

		await updateWarehouseItemsOnDelete(id, productionOrderId, transaction);

		await updateProductionOrderOnDelete(productionOrderId, id, transaction);

		await deleteProductionIssues(productionOrderId, id, transaction);

		const message = `${req.user.username ||
			'Unknown user'} deleted the Production Receipt ${productionReceipt.id} on ${Moment().format(
			'DD-MM-YYYY hh:mm:ss A'
		)}`;
		await helper.createProductionOrderLog(productionOrderId, message, req.user.id || null, transaction);

		// commit
		await transaction.commit();

		return res.status(202).send({
			message: 'Deleted Successfully.',
			success: true
		});
	} catch (err) {
		// Rollback transaction only if the transaction object is defined
		if (transaction) await transaction.rollback();
		console.log('err,err', err.message);
		return res.status(400).send({
			success: false,
			message: 'Failed',
			error: err && err.message ? err.message : err
		});
	}
};

exports.generateBundleNumbers = async (req, res, next) => {
	try {
		let { piecesPerBundle, quantity, barcode, itemMasterId } = req.body;
		const bundles = [];

		if (!piecesPerBundle || !quantity || !barcode || !itemMasterId)
			throw new Error('Please provide valid parameters');

		let numberOfBundles = Math.trunc(+quantity / +piecesPerBundle);
		const loosePieces = +quantity % +piecesPerBundle;

		// Add up one more bundle if there is loose pieces
		if (loosePieces) numberOfBundles++;

		const itemMaster = await ItemMaster.findOne({
			where: {
				id: itemMasterId,
				managementTypeId: 4 //Batch with bundle
			},
			attributes: [ 'bundleNextNumber' ]
		}).catch((e) => {
			throw e;
		});

		if (!itemMaster) throw new Error('Item master not found');

		let bundleNextNumber = +itemMaster.bundleNextNumber;

		for (let i = 1; i <= numberOfBundles; i++) {
			const bundleNumber = barcode + bundleNextNumber.toString();

			bundles.push({
				bundleNumber,
				numberOfPieces: i === numberOfBundles && loosePieces ? loosePieces : piecesPerBundle
			});

			bundleNextNumber++;
		}

		return res.status(200).send({
			success: true,
			message: 'Bundles generated Successfully.',
			bundles,
			loosePieces
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

exports.rebundle = async (req, res, next) => {
	const transaction = await db.sequelize.transaction().catch((e) => {
		console.log(e);
		throw e;
	});

	try {
		let { id } = req.params;

		let { numberOfPieces } = req.body;

		if (!numberOfPieces) throw new Error('Please provide valid parameters');

		// Fetch the bundle
		const bundle = await OIVLBundleNumbers.findOne({
			where: {
				id
			},
			include: {
				model: ProductionReceiptItems,
				attributes: [ 'productId', 'uomId' ]
			},
			transaction
		}).catch((e) => {
			throw e;
		});

		if (!bundle) throw new Error('Bundle not found');

		let previousQty = +bundle.quantityInBaseUnit;

		// Fetch the OIVL
		const oivl = await OIVL.findOne({
			where: { id: bundle.oivlId },
			transaction
		}).catch((e) => {
			throw e;
		});

		if (!oivl) throw new Error('Batch not found');

		// Decrease the existing qty
		await oivl
			.update(
				{
					inQty: +oivl.inQty - +previousQty,
					openQty: +oivl.openQty - +previousQty
				},
				{ transaction }
			)
			.catch((e) => {
				throw e;
			});

		let newQtyInBaseUnit = await helper.getConvertedQuantity(
			bundle.ProductionReceiptItem.uomId,
			bundle.ProductionReceiptItem.productId,
			numberOfPieces
		);

		// Update the bundlke with new info
		await bundle
			.update(
				{
					numberOfPieces,
					quantityInBaseUnit: newQtyInBaseUnit
				},
				{ transaction }
			)
			.catch((e) => {
				throw e;
			});

		// Increase the Qty with new qty
		await oivl
			.update(
				{
					inQty: +oivl.inQty + +newQtyInBaseUnit,
					openQty: +oivl.openQty + +newQtyInBaseUnit
				},
				{ transaction }
			)
			.catch((e) => {
				throw e;
			});

		await transaction.commit();

		return res.status(200).send({
			success: true,
			message: 'Re-bundled Successfully.',
			bundle
		});
	} catch (err) {
		// Rollback transaction only if the transaction object is defined
		if (transaction) await transaction.rollback();
		console.log(err);

		return res.status(400).send({
			success: false,
			message: 'Failed',
			error: err && err.message ? err.message : err
		});
	}
};

const insertProductionReceiptItems = async (
	productionReceiptItems,
	productionReceiptId,
	transaction,
	productionReceipt
) => {
	console.log('####################################insertProductionReceiptItems#########################');
	for (let i = 0; i < productionReceiptItems.length; i++) {
		const item = productionReceiptItems[i];
		var inputParams = {
			productId: item.productId,
			description: item.description,
			warehouseId: item.warehouseId,
			receiptQuantity: item.receiptQuantity,
			uomId: item.uomId,
			rejectionQuantity: item.rejectionQuantity,
			rejectionUomId: item.rejectionUomId
		};

		if (item.id) {
			const componentObj = await ProductionReceiptItems.findOne({
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
			inputParams.productionReceiptId = productionReceiptId;

			await ProductionReceiptItems.create(inputParams, {
				transaction
			}).catch((e) => {
				console.log(e);
				throw e;
			});
		}

		await updateOnHandQuantity(item, transaction);

		await updateScrapQuantity(lineItem, transaction);

		await addOIVLData(productionReceipt, item, transaction);
	}
};

const updateOnHandQuantity = async (lineItem, transaction) => {
	console.log('####################################updateOnHandQuantity#########################');

	const warehouseItem = await WarehouseItem.findOne({
		where: {
			itemMasterId: lineItem.productId,
			warehouseId: lineItem.warehouseId
		}
	}).catch((e) => {
		console.log(e);
		throw e;
	});

	let receiptQuantity = await helper.getConvertedQuantity(
		lineItem.uomId,
		lineItem.productId,
		lineItem.receiptQuantity
	);

	if (warehouseItem && warehouseItem.id) {
		await warehouseItem
			.increment(
				{
					onHand: receiptQuantity
				},
				{
					transaction
				}
			)
			.catch((e) => {
				console.log(e);
				throw e;
			});
	} else {
		let params = {
			itemMasterId: lineItem.productId,
			warehouseId: lineItem.warehouseId,
			onHand: receiptQuantity
		};

		await WarehouseItem.create(params, {
			transaction
		}).catch((e) => {
			console.log(e);
			throw e;
		});
	}
};

const updateScrapQuantity = async (lineItem, productionOrderId, transaction, isDelete = false) => {
	console.log('####################################updateScrapQuantity#########################');
	let scrapWarehouseId = 1;

	const productionOrder = await ProductionOrder.findOne({
		where: {
			id: productionOrderId
		},
		include: [ ProductionUnit ]
	}).catch((e) => {
		console.log(e);
		throw e;
	});

	if (productionOrder && productionOrder.ProductionUnit && productionOrder.ProductionUnit.scrapWarehouseId)
		scrapWarehouseId = productionOrder.ProductionUnit.scrapWarehouseId;

	const scrapWarehouse = await WarehouseItem.findOne({
		where: {
			itemMasterId: lineItem.productId,
			warehouseId: scrapWarehouseId
		}
	}).catch((e) => {
		console.log(e);
		throw e;
	});

	let rejectionQuantity = await helper.getConvertedQuantity(
		lineItem.rejectionUomId,
		lineItem.productId,
		lineItem.rejectionQuantity
	);

	if (scrapWarehouse && scrapWarehouse.id) {
		await scrapWarehouse
			.increment(
				{
					onHand: isDelete ? rejectionQuantity * -1 : rejectionQuantity
				},
				{
					transaction
				}
			)
			.catch((e) => {
				console.log(e);
				throw e;
			});
	} else {
		let params = {
			itemMasterId: lineItem.productId,
			warehouseId: 1,
			onHand: isDelete ? rejectionQuantity * -1 : rejectionQuantity
		};

		await WarehouseItem.create(params, {
			transaction
		}).catch((e) => {
			console.log(e);
			throw e;
		});
	}
};

const addOIVLData = async (productionReceipt, item, productionReceiptItemId, transaction) => {
	console.log('####################################addOIVLData#########################');
	const product = await ItemMaster.findOne({
		where: {
			id: item.productId
		}
	});

	if (product && product.id)
		switch (product.managementTypeId) {
			case 1: // Management type is NONE
				await addOIVLWhenNoManagementType(productionReceipt, item, transaction);
				break;
			case 2: // Management type is BATCH WISE
				await addOIVLWhenBatch(productionReceipt, item, productionReceiptItemId, transaction);
				break;

			case 3: // Management type is SERIALLY NUMBERED
				await addOIVLWhenSeriallyNumbered(productionReceipt, item, transaction);
				break;

			case 4: // Management type is BATCH WITH BUNDLE
				await addOIVLWhenBatch(productionReceipt, item, productionReceiptItemId, transaction);
				break;

			default:
				await addOIVLWhenNoManagementType(productionReceipt, item, transaction);
				break;
		}
};

const addOIVLWhenNoManagementType = async (productionReceipt, item, transaction) => {
	console.log('####################################addOIVLWhenNoManagementType#########################');
	let itemMaster = await ItemMaster.findOne({
		where: {
			id: item.productId
		}
	}).catch((e) => {
		console.log(e);
		throw e;
	});

	let barcode = parseInt(itemMaster.latestBarcode) + 1;

	let quantityInBaseUnit = await helper.getConvertedQuantity(item.uomId, item.productId, item.receiptQuantity);

	let priceInBaseUnit = await helper.getConvertedPrice(item.uomId, item.productId, item.unitCost);

	// Create a new OIVL
	let data = {
		docNum: productionReceipt.docNum,
		docDate: productionReceipt.docDate,
		docType: 'PRPT',
		documentId: productionReceipt.id,
		itemMasterId: item.productId,
		warehouseId: item.warehouseId,
		inQty: quantityInBaseUnit,
		openQty: quantityInBaseUnit,
		barcode: itemMaster.code.trim() + barcode.toString(),
		price: priceInBaseUnit
	};

	const existingOIVLBarcode = await OIVL.findOne({
		where: {
			barcode: data.barcode,
			itemMasterId: item.productId,
			deleted: false
		}
	}).catch((error) => {
		console.log(error);
		throw error;
	});

	if (existingOIVLBarcode && existingOIVLBarcode.id) {
		console.log('Barcode ' + data.barcode + ' already exists.');
		throw new Error('Barcode ' + data.barcode + ' already exists.');
	}

	const createdOIVL = await OIVL.create(data, {
		transaction
	}).catch((e) => {
		console.log(e);
		throw e;
	});

	//Insert Production Receipt OIVLs
	await ProductionReceiptOIVL.create(
		{
			productionReceiptId: productionReceipt.id,
			oivlId: createdOIVL.id,
			quantity: item.receiptQuantity
		},
		{
			transaction
		}
	).catch((e) => {
		console.log(e);
		throw e;
	});

	//Update latest barcode
	await itemMaster
		.update(
			{
				latestBarcode: barcode
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

const addOIVLWhenBatch = async (productionReceipt, lineItem, productionReceiptItemId, transaction) => {
	console.log('####################################addOIVLWhenBatch#########################');

	if (lineItem && lineItem.OIVLs && lineItem.OIVLs.length > 0) {
		for (let i = 0; i < lineItem.OIVLs.length; i++) {
			const selectedOIVL = lineItem.OIVLs[i];

			let quantityInBaseUnit = await helper.getConvertedQuantity(
				lineItem.uomId,
				lineItem.productId,
				selectedOIVL.quantity
			);

			const existingOIVL = await OIVL.findOne({
				where: {
					barcode: selectedOIVL.barcode,
					itemMasterId: lineItem.productId,
					warehouseId: lineItem.warehouseId,
					deleted: false
				}
			}).catch((error) => {
				console.log(error);
				throw error;
			});

			if (existingOIVL && existingOIVL.id) {
				console.log('Barcode ' + selectedOIVL.barcode + ' already exists.');

				await updateExistingOIVL({
					existingOIVL,
					quantityInBaseUnit,
					bundleNumbers: selectedOIVL.OIVLBundleNumbers,
					productionReceiptId: productionReceipt.id,
					productionOrderId: productionReceipt.productionOrderId,
					uomId: lineItem.uomId,
					productId: lineItem.productId,
					productionReceiptItemId,
					transaction
				});

				//Insert Production Receipt OIVLs
				await ProductionReceiptOIVL.create(
					{
						productionReceiptId: productionReceipt.id,
						oivlId: existingOIVL.id,
						quantity: selectedOIVL.quantity
					},
					{
						transaction
					}
				).catch((e) => {
					console.log(e);
					throw e;
				});
			} else {
				let priceInBaseUnit = await helper.getConvertedPrice(
					lineItem.uomId,
					lineItem.productId,
					lineItem.unitCost
				);

				let data = {
					docNum: productionReceipt.docNum,
					docDate: productionReceipt.docDate,
					docType: 'PRPT',
					documentId: productionReceipt.id,
					itemMasterId: lineItem.productId,
					warehouseId: lineItem.warehouseId,
					inQty: 0,
					openQty: 0,
					barcode: selectedOIVL.barcode,
					price: priceInBaseUnit || lineItem.unitCost
				};

				const createdOIVL = await OIVL.create(data, {
					// include: include,
					transaction: transaction
				}).catch((e) => {
					console.log(e);
					throw e;
				});

				await updateExistingOIVL({
					existingOIVL: createdOIVL,
					quantityInBaseUnit,
					bundleNumbers: selectedOIVL.OIVLBundleNumbers,
					productionReceiptId: productionReceipt.id,
					productionOrderId: productionReceipt.productionOrderId,
					uomId: lineItem.uomId,
					productId: lineItem.productId,
					productionReceiptItemId,
					transaction
				});

				//Insert Production Receipt OIVLs
				await ProductionReceiptOIVL.create(
					{
						productionReceiptId: productionReceipt.id,
						oivlId: createdOIVL.id,
						quantity: selectedOIVL.quantity
					},
					{
						transaction
					}
				).catch((e) => {
					console.log(e);
					throw e;
				});
			}

			// if (selectedOIVL && selectedOIVL.OIVLBundleNumbers && selectedOIVL.OIVLBundleNumbers.length > 0) {
			// 	//Update ProductionOrderBundleNumbers status
			// 	await updateProductionOrderBundleNumberStatus(
			// 		selectedOIVL.OIVLBundleNumbers,
			// 		productionReceipt.id,
			// 		productionReceipt.docDate,
			// 		transaction
			// 	);
			// }
		}
	} else {
		console.log('No OIVLs selected for an Item which is batch wise managed');
		throw new Error('No OIVLs selected for an Item which is batch wise managed');
	}
};

const updateExistingOIVL = async ({
	existingOIVL,
	quantityInBaseUnit,
	bundleNumbers,
	productionReceiptId,
	productionOrderId,
	uomId,
	productId,
	productionReceiptItemId,
	transaction
}) => {
	console.log('####################################updateExistingOIVL#########################');

	//Update OIVL quantities
	await existingOIVL
		.increment(
			{
				inQty: quantityInBaseUnit,
				openQty: quantityInBaseUnit
			},
			{
				transaction
			}
		)
		.catch((e) => {
			console.log(e);
			throw e;
		});

	// Insert bundle numbers
	if (bundleNumbers && bundleNumbers.length > 0) {
		for (let i = 0; i < bundleNumbers.length; i++) {
			const bundle = bundleNumbers[i];

			let quantityInBaseUnit = await helper.getConvertedQuantity(uomId, productId, bundle.numberOfPieces);

			await OIVLBundleNumbers.create(
				{
					productionOrderId,
					productionReceiptId,
					productionReceiptItemId,
					numberOfPieces: bundle.numberOfPieces,
					// productionOrderBundleNumberId: OIVLBundle.productionOrderBundleNumberId,
					quantityInBaseUnit,
					oivlId: existingOIVL.id,
					bundleNumber: bundle.bundleNumber
				},
				{
					transaction
				}
			).catch((e) => {
				console.log(e);
				throw e;
			});
		}
	}
};

const updateProductionOrderBundleNumberStatus = async (bundleNumbers, productionReceiptId, docDate, transaction) => {
	console.log(
		'##############################updateProductionOrderBundleNumberStatus###############################################'
	);
	for (let i = 0; i < bundleNumbers.length; i++) {
		const bundleNumber = bundleNumbers[i];

		await ProductionOrderBundleNumbers.update(
			{
				available: false,
				productionReceiptId,
				docDate
			},
			{
				where: {
					id: bundleNumber.productionOrderBundleNumberId
				},
				transaction
			}
		).catch((e) => {
			console.log(e);
			throw e;
		});
	}
};

const addOIVLWhenSeriallyNumbered = async (productionReceipt, lineItem, transaction) => {
	console.log('####################################addOIVLWhenSeriallyNumbered#########################');
	let quantityInBaseUnit = await helper.getConvertedQuantity(
		lineItem.uomId,
		lineItem.productId,
		lineItem.receiptQuantity
	);

	let priceInBaseUnit = await helper.getConvertedPrice(lineItem.uomId, lineItem.productId, lineItem.unitCost);

	let data = {
		docNum: productionReceipt.docNum,
		docDate: productionReceipt.docDate,
		docType: 'PRPT',
		documentId: productionReceipt.id,
		itemMasterId: lineItem.productId,
		warehouseId: lineItem.warehouseId,
		inQty: quantityInBaseUnit,
		openQty: quantityInBaseUnit,
		price: priceInBaseUnit || lineItem.unitCost
	};

	const createdOIVL = await OIVL.create(data, {
		transaction
	}).catch((e) => {
		console.log(e);
		throw e;
	});

	if (
		lineItem &&
		lineItem.OIVLs &&
		lineItem.OIVLs.length > 0 &&
		lineItem.OIVLs[0].barcodePrefix &&
		lineItem.OIVLs[0].barcodeInitialNumber > 0
	) {
		var barcodePrefix = lineItem.OIVLs[0].barcodePrefix;
		var initialNumber = lineItem.OIVLs[0].barcodeInitialNumber;
		for (let i = 0; i < lineItem.receiptQuantity; i++) {
			let barcodeData = {
				barcode: barcodePrefix + initialNumber.toString(),
				oivlId: createdOIVL.id,
				itemMasterId: lineItem.productId,
				warehouseId: lineItem.warehouseId
			};

			const existingOIVLBarcode = await OIVLBarcodes.findOne({
				where: {
					barcode: barcodePrefix + initialNumber.toString(),
					itemMasterId: lineItem.productId,
					deletedAt: null
				}
			}).catch((error) => {
				console.log(error);
				throw error;
			});

			if (existingOIVLBarcode && existingOIVLBarcode.id) {
				console.log('Barcode ' + barcodePrefix + ' ' + initialNumber.toString() + ' already exists.');
				throw new Error('Barcode ' + barcodePrefix + initialNumber.toString() + ' already exists.');
			}

			//Create OIVL Barcode
			const createdOIVLBarcode = await OIVLBarcodes.create(barcodeData, {
				transaction
			}).catch((e) => {
				console.log(e);
				throw e;
			});

			//Insert Production Receipt OIVLs
			await ProductionReceiptOIVL.create(
				{
					productionReceiptId: productionReceipt.id,
					oivlId: createdOIVL.id,
					oivlBarcodeId: createdOIVLBarcode.id,
					quantity: 1
				},
				{
					transaction
				}
			).catch((e) => {
				console.log(e);
				throw e;
			});

			initialNumber++;
		}
	} else {
		console.log('Barcode prefix & initial number missing.');
		console.log(lineItem);
		throw new Error('Barcode prefix & initial number missing.');
	}
};

const deleteOIVLs = async (productionReceipt, transaction) => {
	console.log('####################################deleteOIVLs#########################');
	const existingOIVL = await OIVL.findAll({
		where: {
			docType: 'PRPT',
			documentId: productionReceipt.id,
			deleted: false,
			deletedAt: null
		},
		attributes: [ 'id', 'outQty' ]
	}).catch((error) => {
		console.log(error);
		throw error;
	});

	const ids = existingOIVL.map((data) => {
		return data.id;
	});

	for (let i = 0; i < existingOIVL.length; i++) {
		const oivlObj = existingOIVL[i];

		if (+oivlObj.outQty > 0) throw new Error('Batches has already consumed. Cannot delete the Receipt!');

		await oivlObj
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
	}
};

const updateWarehouseItemsOnDelete = async (productionReceiptId, productionOrderId, transaction) => {
	console.log('####################################updateWarehouseItemsOnDelete#########################');
	const productionReceiptItems = await ProductionReceiptItems.findAll({
		where: {
			productionReceiptId
		},
		attributes: [ 'productId', 'receiptQuantity', 'warehouseId', 'uomId', 'rejectionUomId', 'rejectionQuantity' ],
		raw: true,
		transaction
	});

	for (let i = 0; i < productionReceiptItems.length; i++) {
		const item = productionReceiptItems[i];

		let convertedReceiptQuantity = await helper.getConvertedQuantity(
			item.uomId,
			item.productId,
			item.receiptQuantity
		);

		await WarehouseItem.decrement(
			{
				onHand: convertedReceiptQuantity
			},
			{
				where: {
					itemMasterId: item.productId,
					warehouseId: item.warehouseId
				},
				transaction
			}
		).catch((e) => {
			console.log(e);
			throw e;
		});

		if (item.rejectionUomId && item.rejectionQuantity && item.rejectionQuantity > 0)
			await updateScrapQuantity(item, productionOrderId, transaction, true);
	}
};

const updateProductionOrder = async (productionOrderId, status, productionReceiptItems, transaction) => {
	console.log('####################################updateProductionOrder#########################');

	const productionOrder = await ProductionOrder.findOne({
		where: {
			id: productionOrderId
		}
	}).catch((e) => {
		console.log(e);
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
			console.log(e);
			throw e;
		});

	for (let i = 0; i < productionReceiptItems.length; i++) {
		const productionReceiptItem = productionReceiptItems[i];

		let quantityInBaseUnit = await helper.getConvertedQuantity(
			productionReceiptItem.uomId,
			productionReceiptItem.productId,
			productionReceiptItem.receiptQuantity
		);

		let rejectedQuantityInBaseUnit = null;
		if (productionReceiptItem.rejectionUomId && productionReceiptItem.rejectionQuantity)
			rejectedQuantityInBaseUnit = await helper.getConvertedQuantity(
				productionReceiptItem.rejectionUomId,
				productionReceiptItem.productId,
				productionReceiptItem.rejectionQuantity
			);

		let conversionFactor = 1;

		const itemMaster = await ItemMaster.findOne({
			where: {
				id: productionReceiptItem.productId
			}
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		if (itemMaster.inventoryUOMId != productionOrder.uomId) {
			let plannedUOMConversionFactor = await ItemMasterUOMs.findOne({
				where: {
					itemMasterId: productionReceiptItem.productId,
					uomId: productionOrder.uomId
				}
			}).catch((e) => {
				console.log(e);
				throw e;
			});

			if (plannedUOMConversionFactor && plannedUOMConversionFactor.conversionFactor)
				conversionFactor = plannedUOMConversionFactor.conversionFactor;
		}

		if (conversionFactor > 0) {
			let qtyInPlannedUOM = quantityInBaseUnit / conversionFactor;
			let rejectedQtyInPlannedUOM = null;
			if (rejectedQuantityInBaseUnit) rejectedQtyInPlannedUOM = rejectedQuantityInBaseUnit / conversionFactor;

			await productionOrder
				.increment(
					{
						receivedQuantity: qtyInPlannedUOM || 0,
						rejectedQty: rejectedQtyInPlannedUOM || 0
					},
					{
						transaction
					}
				)
				.catch((e) => {
					console.log(e);
					throw e;
				});
		}
	}
};

const updateProductionOrderOnDelete = async (productionOrderId, productionReceiptId, transaction) => {
	console.log('####################################updateProductionOrderOnDelete#########################');

	const productionOrder = await ProductionOrder.findOne({
		where: {
			id: productionOrderId
		},
		transaction
	}).catch((e) => {
		console.log(e);
		throw e;
	});

	const existingProductionReceipt = await ProductionReceipt.findOne({
		where: {
			productionOrderId,
			id: {
				[Op.ne]: productionReceiptId
			}
		},
		transaction
	});

	if (!existingProductionReceipt) {
		await productionOrder
			.update(
				{
					statusId: status.componentsIssued
				},
				{
					transaction
				}
			)
			.catch((e) => {
				console.log(e);
				throw e;
			});
	}

	const productionReceiptItems = await ProductionReceiptItems.findAll({
		where: {
			productionReceiptId
		},
		attributes: [ 'productId', 'receiptQuantity', 'warehouseId', 'uomId', 'rejectionUomId', 'rejectionQuantity' ],
		raw: true,
		transaction
	});

	for (let i = 0; i < productionReceiptItems.length; i++) {
		const productionReceiptItem = productionReceiptItems[i];

		let quantityInBaseUnit = await helper.getConvertedQuantity(
			productionReceiptItem.uomId,
			productionReceiptItem.productId,
			productionReceiptItem.receiptQuantity
		);

		let rejectedQuantityInBaseUnit = null;
		if (productionReceiptItem.rejectionUomId && productionReceiptItem.rejectionQuantity)
			rejectedQuantityInBaseUnit = await helper.getConvertedQuantity(
				productionReceiptItem.rejectionUomId,
				productionReceiptItem.productId,
				productionReceiptItem.rejectionQuantity
			);

		let conversionFactor = 1;

		const itemMaster = await ItemMaster.findOne({
			where: {
				id: productionReceiptItem.productId
			}
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		if (itemMaster.inventoryUOMId != productionOrder.uomId) {
			let plannedUOMConversionFactor = await ItemMasterUOMs.findOne({
				where: {
					itemMasterId: productionReceiptItem.productId,
					uomId: productionOrder.uomId
				}
			}).catch((e) => {
				console.log(e);
				throw e;
			});

			if (plannedUOMConversionFactor && plannedUOMConversionFactor.conversionFactor)
				conversionFactor = plannedUOMConversionFactor.conversionFactor;
		}

		if (conversionFactor > 0) {
			let qtyInPlannedUOM = quantityInBaseUnit / conversionFactor;
			let rejectedQtyInPlannedUOM = null;
			if (rejectedQuantityInBaseUnit) rejectedQtyInPlannedUOM = rejectedQuantityInBaseUnit / conversionFactor;

			await productionOrder
				.decrement(
					{
						receivedQuantity: qtyInPlannedUOM || 0,
						rejectedQty: rejectedQtyInPlannedUOM || 0
					},
					{
						transaction
					}
				)
				.catch((e) => {
					console.log(e);
					throw e;
				});
		}
	}
};

const deleteProductionReceiptOIVLs = async (productionReceiptId, transaction) => {
	console.log(
		'############################################deleteProductionReceiptOIVLs##################################'
	);
	const productionReceiptOIVLs = await ProductionReceiptOIVL.findAll({
		where: {
			productionReceiptId: productionReceiptId
		},
		attributes: [ 'oivlId', 'oivlBarcodeId', 'quantity', 'id' ],
		raw: true
	});

	for (let i = 0; i < productionReceiptOIVLs.length; i++) {
		const item = productionReceiptOIVLs[i];

		if (item.oivlBarcodeId) {
			// Update OIVL Barcode status

			const oivlBarcode = await OIVLBarcodes.findOne({
				where: {
					id: item.oivlBarcodeId
				},
				transaction
			});

			if (!oivlBarcode.available) throw new Error('Batches has already consumed. Cannot delete the Receipt!');

			await oivlBarcode
				.update(
					{
						deletedAt: Moment.now()
					},
					{
						transaction
					}
				)
				.catch((e) => {
					console.log(e);
					throw e;
				});
		}

		// Delete Production Receipt OIVL
		await ProductionReceiptOIVL.update(
			{
				deletedAt: Moment.now()
			},
			{
				where: {
					id: item.id
				},
				transaction
			}
		).catch((e) => {
			console.log(e);
			throw e;
		});
	}
};

const updateWarehouseItemPrice = async (lineItem, transaction) => {
	console.log('######################updateWarehouseItemPrice###########################');
	let price = 0;

	let itemMaster = await ItemMaster.findOne({
		where: {
			id: lineItem.productId
		}
	}).catch((e) => {
		console.log(e);
		throw e;
	});

	let convertedReceiptQuantity = await helper.getConvertedQuantity(
		lineItem.uomId,
		lineItem.productId,
		lineItem.receiptQuantity
	);

	let priceInBaseUnit = await helper.getConvertedPrice(lineItem.uomId, lineItem.productId, lineItem.unitCost);

	if (itemMaster) {
		let oivls = [];

		const warehouseItem = await WarehouseItem.findOne({
			where: {
				itemMasterId: lineItem.productId,
				warehouseId: lineItem.warehouseId
			},
			transaction
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		if (itemMaster.valuationMethod == 'm') {
			// Moving Average
			oivls = await OIVL.findAll({
				where: {
					itemMasterId: lineItem.productId,
					warehouseId: lineItem.warehouseId,
					openQty: {
						[Op.gt]: 0
					},
					deleted: false
				},
				transaction
			}).catch((e) => {
				console.log(e);
				throw e;
			});

			//Fetch total quantity
			let oivlTotalOpenQty = oivls.map((oivlObj) => +oivlObj.openQty).reduce((a, b) => a + b, 0);

			oivlTotalOpenQty = +oivlTotalOpenQty + +convertedReceiptQuantity;

			//Fetch total price
			price = oivls
				.map((oivlObj) => {
					return oivlObj.openQty * oivlObj.price;
				})
				.reduce((a, b) => a + b, 0);

			price += convertedReceiptQuantity * +priceInBaseUnit;
			console.log('oivlTotalOpenQty', oivlTotalOpenQty);
			console.log('price', price);

			//Calculate average price
			price = (price / oivlTotalOpenQty).toFixed(4);

			console.log('Updated Price', price);

			if (warehouseItem) {
				await warehouseItem
					.update(
						{
							price: price && price != 0 ? price : lineItem.unitCost
						},
						{
							transaction
						}
					)
					.catch((e) => {
						console.log(e);
						throw e;
					});

				await warehouseItem
					.increment(
						{
							onHand: convertedReceiptQuantity
						},
						{
							transaction
						}
					)
					.catch((e) => {
						console.log(e);
						throw e;
					});
			} else {
				let warehouseItemData = {
					itemMasterId: lineItem.productId,
					warehouseId: lineItem.warehouseId,
					price: price && price != 0 ? price : lineItem.unitCost,
					onHand: convertedReceiptQuantity
				};

				await WarehouseItem.create(warehouseItemData, {
					transaction
				}).catch((e) => {
					console.log(e);
					throw e;
				});
			}
		} else {
			if (warehouseItem) {
				await warehouseItem
					.update(
						{
							price: price && price != 0 ? price : lineItem.unitCost
						},
						{
							transaction
						}
					)
					.catch((e) => {
						console.log(e);
						throw e;
					});

				await warehouseItem
					.increment(
						{
							onHand: convertedReceiptQuantity
						},
						{
							transaction
						}
					)
					.catch((e) => {
						console.log(e);
						throw e;
					});
			} else {
				let warehouseItemData = {
					itemMasterId: lineItem.productId,
					warehouseId: lineItem.warehouseId,
					price: price && price != 0 ? price : lineItem.unitCost,
					onHand: convertedReceiptQuantity
				};

				await WarehouseItem.create(warehouseItemData, {
					transaction
				}).catch((e) => {
					console.log(e);
					throw e;
				});
			}
		}
	}
};

const generateProductionIssues = async (
	productionOrderId,
	productionReceiptId,
	productionReceiptItems,
	transaction
) => {
	console.log('####################################generateProductionIssues#########################');

	const productionOrder = await ProductionOrder.findOne({
		where: {
			id: productionOrderId
		}
	}).catch((e) => {
		console.log(e);
		throw e;
	});

	const productionOrderComponents = await ProductionOrderComponents.findAll({
		where: {
			productionOrderId: productionOrderId
		},
		include: [
			{
				model: ItemMaster,
				attributes: [ 'id', 'consumptionTypeId', 'name' ],
				where: {
					consumptionTypeId: consumptionTypes.backFlush // Backflush Consumption Type
				}
			}
		],
		attributes: [ 'productId', 'uomId', 'totalQuantity', 'quantityPerUnit' ]
	}).catch((e) => {
		console.log(e);
		throw e;
	});

	let receiptQuantity = 0;

	productionReceiptItems.forEach((item, index) => {
		if (productionOrder.productId === item.productId) {
			receiptQuantity += +item.receiptQuantity;
		}
	});

	if (productionOrderComponents && productionOrderComponents.length > 0 && receiptQuantity > 0) {
		let productionIssueItems = [];
		let grandTotal = 0;
		const productionIssueDocNo = await helper.getNextDocumentNumber('PIS', 'BRST15');
		let productionIssueParams = {
			docNum: productionIssueDocNo.nextNumber,
			series: 'BRST15',
			docDate: Date.now(),
			productionOrderId: productionOrderId,
			productionReceiptId: productionReceiptId
		};

		for (let i = 0; i < productionOrderComponents.length; i++) {
			let productionOrderComponent = productionOrderComponents[i];

			if (productionOrderComponent.ItemMaster) {
				let itemMaster = productionOrderComponent.ItemMaster;
				let convertedTotalQuantity = await helper.getConvertedQuantity(
					productionOrderComponent.uomId,
					productionOrderComponent.productId,
					productionOrderComponent.quantityPerUnit
				);
				let issueQuantity = receiptQuantity * +productionOrderComponent.quantityPerUnit;
				let convertedIssueQuantity = receiptQuantity * +convertedTotalQuantity;

				let total = await helper.updateOIVLForNoBatchItems(itemMaster, convertedIssueQuantity, transaction);

				let averageIssuePrice = (+total / +issueQuantity).toFixed(4);

				let itemParam = {
					productId: itemMaster.id,
					warehouseId: null,
					issuedQuantity: issueQuantity,
					uomId: productionOrderComponent.uomId,
					price: averageIssuePrice,
					total: total
				};

				grandTotal += total;
				productionIssueItems.push(itemParam);
			}
		}

		productionIssueParams.grandTotal = grandTotal;
		productionIssueParams.ProductionIssueItems = productionIssueItems;

		if (productionIssueItems.length > 0 && productionIssueParams.grandTotal > 0) {
			await ProductionIssue.create(productionIssueParams, {
				include: {
					model: ProductionIssueItems,
					required: true
				},
				transaction: transaction
			}).catch((e) => {
				console.log(e);
				throw e;
			});
		}
	}
};

const refineProductionReceiptItems = async (productionReceiptItems) => {
	for (let i = 0; i < productionReceiptItems.length; i++) {
		const productionReceiptItem = productionReceiptItems[i];
		let noOfBundles = 0;

		if (productionReceiptItem.OIVLs && productionReceiptItem.OIVLs.length) {
			for (let i = 0; i < productionReceiptItem.OIVLs.length; i++) {
				const oivl = productionReceiptItem.OIVLs[i];

				if (oivl.OIVLBundleNumbers && oivl.OIVLBundleNumbers.length)
					noOfBundles += oivl.OIVLBundleNumbers.length;
			}
		}
		productionReceiptItem.noOfBundles = noOfBundles;
	}

	return productionReceiptItems;
};

const deleteProductionIssues = async (productionOrderId, productionReceiptId, transaction) => {
	console.log('#################################### deleteProductionIssues #########################');
	const productionReceiptItems = await ProductionReceiptItems.findAll({
		where: {
			productionReceiptId
		},
		transaction
	});

	const productionOrder = await ProductionOrder.findOne({
		where: {
			id: productionOrderId
		},
		include: {
			model: ProductionOrderComponents,
			attributes: [ 'productId', 'uomId', 'totalQuantity', 'quantityPerUnit' ],
			include: {
				model: ItemMaster,
				attributes: [ 'id', 'consumptionTypeId', 'name' ],
				where: {
					consumptionTypeId: consumptionTypes.backFlush // Backflush Consumption Type
				}
			}
		},
		transaction
	}).catch((e) => {
		console.log(e);
		throw e;
	});

	const productionOrderComponents = productionOrder.ProductionOrderComponents;

	await ProductionIssue.update(
		{
			deletedAt: new Date()
		},
		{
			where: { productionReceiptId },
			transaction
		}
	).catch((error) => {
		console.log(error);
		throw error;
	});

	let receiptQuantity = 0;

	productionReceiptItems.forEach((item, index) => {
		if (productionOrder.productId === item.productId) {
			receiptQuantity += +item.receiptQuantity;
		}
	});

	if (productionOrderComponents && productionOrderComponents.length > 0 && receiptQuantity > 0) {
		for (let i = 0; i < productionOrderComponents.length; i++) {
			let productionOrderComponent = productionOrderComponents[i];

			if (productionOrderComponent.ItemMaster) {
				let itemMaster = productionOrderComponent.ItemMaster;
				let convertedTotalQuantity = await helper.getConvertedQuantity(
					productionOrderComponent.uomId,
					productionOrderComponent.productId,
					productionOrderComponent.quantityPerUnit
				);

				let convertedIssueQuantity = receiptQuantity * +convertedTotalQuantity;

				await helper.updateOIVLForNoBatchItems(itemMaster, convertedIssueQuantity * -1, transaction);
			}
		}
	}
};
