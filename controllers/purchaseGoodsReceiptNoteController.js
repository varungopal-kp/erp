const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require('../models/index');
const PurchaseGoodsReceiptNote = require('../models').PurchaseGoodsReceiptNote;
const PurchaseGoodsReceiptNoteItem = require('../models').PurchaseGoodsReceiptNoteItem;
const PurchaseGoodsReceiptNoteOIVL = require('../models').PurchaseGoodsReceiptNoteOIVL;
const ItemMaster = require('../models').ItemMaster;
const UOM = require('../models').UOM;
const Warehouse = require('../models').Warehouse;
const Branch = require('../models').Branch;
const Currency = require('../models').Currency;
const OIVL = require('../models').OIVL;
const BusinessPartner = require('../models').BusinessPartner;
const ItemMasterUOMs = require('../models').ItemMasterUOMs;
const WarehouseItem = require('../models').WarehouseItems;
const OIVLBarcodes = require('../models').OIVLBarcodes;
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
			model: PurchaseGoodsReceiptNoteItem,
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
			purchaseGoodsReceiptNotes: await PurchaseGoodsReceiptNote.findAll({
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

	//     const openPurchaseGoodsReceiptNotes = await getOpenPurchaseGoodsReceiptNotes(req, res, include)
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

	await PurchaseGoodsReceiptNote.findAndCountAll({
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
				purchaseGoodsReceiptNotes: results.rows,
				pageCount,
				itemCount,
				pages: paginate.getArrayPages(req)(3, pageCount, req.query.page)
			});
		})
		.catch((error) => {
			return res.status(400).send({
				error: error.message
			});
		});
};

exports.openPurchaseGoodsReceiptNotes = async (req, res, next) => {
	var include = [
		{
			model: PurchaseGoodsReceiptNoteItem,
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

	let purchaseGoodsReceiptNotes = await PurchaseGoodsReceiptNote.findAll({
		include: include,
		where: {
			status: 'open',
			deleted: false
		},
		order: [ [ 'id', 'DESC' ] ]
		// raw: true,
		// nest: true,
	}).catch((error) => {
		return res.status(400).send({
			error: error
		});
	});

	if (purchaseGoodsReceiptNotes && purchaseGoodsReceiptNotes.length > 0) {
		let completeFlag = 0;

		for (let i = 0; i < purchaseGoodsReceiptNotes.length; i++) {
			let purchaseGoodsReceiptNote = purchaseGoodsReceiptNotes[i];
			let purchaseGoodsReceiptNoteItems = purchaseGoodsReceiptNotes[i].PurchaseGoodsReceiptNoteItems;

			let totalRequiredQty = 0,
				totalAvailableQty = 0,
				fulFillment = [];

			if (purchaseGoodsReceiptNoteItems && purchaseGoodsReceiptNoteItems.length > 0) {
				let purchaseGoodsReceiptNoteItemsCount = purchaseGoodsReceiptNoteItems.length;
				// await getFulfillmentData(purchaseGoodsReceiptNoteItems, purchaseGoodsReceiptNoteCount, totalRequiredQty, totalAvailableQty)

				for (let j = 0; j < purchaseGoodsReceiptNoteItems.length; j++) {
					const purchaseGoodsReceiptNoteItem = purchaseGoodsReceiptNoteItems[j];

					const itemMasterId = purchaseGoodsReceiptNoteItem.itemMasterId;
					let requiredQty = purchaseGoodsReceiptNoteItem.quantity;

					//Calculating the total required quantity
					const uomConversionFactor = await ItemMasterUOMs.findOne({
						where: {
							itemMasterId: itemMasterId,
							uomId: purchaseGoodsReceiptNoteItem.uomId
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

					console.log('itemMasterId', itemMasterId);
					console.log('requiredQty', requiredQty);
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

					console.log('itemMasterId', itemMasterId);
					console.log('availableQty', availableQty);

					const itemMaster = await ItemMaster.findOne({
						where: {
							id: itemMasterId
						}
					});

					let fulfillmentParam = {
						requiredQty: requiredQty,
						availableQty: availableQty,
						item: itemMaster.name
					};

					if (requiredQty < availableQty) {
						fulfillmentParam.fulFillmentPercentage = 100;
					} else if (requiredQty > availableQty) {
						fulfillmentParam.fulFillmentPercentage = Math.round(availableQty / requiredQty * 100);
					}

					fulFillment.push(fulfillmentParam);

					purchaseGoodsReceiptNoteItemsCount--;
				}

				if (purchaseGoodsReceiptNoteItemsCount === 0) {
					// console.log("totalRequiredQty ", totalRequiredQty)
					// console.log("totalAvailableQty ", totalAvailableQty)
					let fulFilled = false;

					let fulfillCount = 0;
					fulFillment.map((obj) => {
						if (obj.availableQty >= obj.requiredQty) {
							fulfillCount++;
						}
					});

					if (fulfillCount === fulFillment.length) fulFilled = true;

					purchaseGoodsReceiptNote.setDataValue('fulFillment', fulFillment);
					purchaseGoodsReceiptNote.setDataValue('fulFilled', fulFilled);
				}
			}
		}

		return res.send({
			purchaseGoodsReceiptNotes: purchaseGoodsReceiptNotes,
			success: true
		});
	} else {
		return res.send({
			purchaseGoodsReceiptNotes: [],
			success: true
		});
	}
};

exports.create = async (req, res, next) => {
	let { purchaseGoodsReceiptNote } = req.body;

	const purchaseGoodsReceiptNoteItems = purchaseGoodsReceiptNote.PurchaseGoodsReceiptNoteItems;

	if (req.headers.user) purchaseGoodsReceiptNote.createdUser = req.headers.user;

	var include = [
		{
			model: PurchaseGoodsReceiptNoteItem,
			required: true
		}
	];

	let transaction;

	const nextDocNo = await helper.getNextDocumentNumber('PRN', purchaseGoodsReceiptNote.series);

	if (nextDocNo) purchaseGoodsReceiptNote.docNum = nextDocNo.nextNumber;

	purchaseGoodsReceiptNote.status = 'open';

	let month = moment(purchaseGoodsReceiptNote.docDate).month() + 1;
	let year = moment(purchaseGoodsReceiptNote.docDate).year();
	let quarter = moment(purchaseGoodsReceiptNote.docDate).quarter();

	purchaseGoodsReceiptNote.month = month;
	purchaseGoodsReceiptNote.year = year;
	purchaseGoodsReceiptNote.quarter = quarter;

	try {
		transaction = await db.sequelize.transaction().catch((e) => {
			console.log(e);
			throw e;
		});

		const newPurchaseGoodsReceiptNote = await PurchaseGoodsReceiptNote.create(purchaseGoodsReceiptNote, {
			// include: include,
			transaction: transaction
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		if (newPurchaseGoodsReceiptNote.id) {
			for (let i = 0; i < purchaseGoodsReceiptNoteItems.length; i++) {
				const lineItem = purchaseGoodsReceiptNoteItems[i];

				if (!lineItem.itemMasterId || !lineItem.warehouseId) continue;

				lineItem.purchaseGoodsReceiptNoteId = newPurchaseGoodsReceiptNote.id;

				await PurchaseGoodsReceiptNoteItem.create(lineItem, {
					transaction
				}).catch((e) => {
					console.log(e);
					throw e;
				});

				// await updateOnHandQuantity(purchaseGoodsReceiptNoteItems[i], transaction)

				await addOIVLData(newPurchaseGoodsReceiptNote, lineItem, transaction);

				await updateWarehouseItemPrice(newPurchaseGoodsReceiptNote, lineItem, transaction);
			}

			// commit
			await transaction.commit();

			return res.status(200).send({
				newPurchaseGoodsReceiptNote,
				success: true,
				message: 'Success'
			});
		} else {
			return res.status(400).send({
				success: false,
				message: 'Failed'
			});
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

const updateOnHandQuantity = async (LineItems, transaction) => {
	let receiptQuantity = await helper.getConvertedQuantity(
		LineItems.uomId,
		LineItems.itemMasterId,
		LineItems.quantity
	);
	console.log('receiptQuantity', receiptQuantity);

	await WarehouseItem.findOne({
		where: {
			itemMasterId: LineItems.itemMasterId,
			warehouseId: LineItems.warehouseId
		}
	})
		.then(async (data) => {
			if (data) {
				await data
					.update(
						{
							onHand: +data.onHand + +receiptQuantity
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
		})
		.catch((e) => {
			console.log(e);
			throw e;
		});
};

const addOIVLData = async (goodsReceipt, item, transaction) => {
	console.log('####################################addOIVLData#########################');
	const product = await ItemMaster.findOne({
		where: {
			id: item.itemMasterId
		}
	});
	if (product && product.id)
		switch (product.managementTypeId) {
			case 1: // Management type is NONE
				await addOIVLWhenNoManagementType(goodsReceipt, item, transaction);
				break;
			case 2: // Management type is BATCH WISE
				await addOIVLWhenBatch(goodsReceipt, item, transaction);
				break;

			case 3: // Management type is SERIALLY NUMBERED
				await addOIVLWhenSeriallyNumbered(goodsReceipt, item, transaction);
				break;

			default:
				await addOIVLWhenNoManagementType(goodsReceipt, item, transaction);
				break;
		}
};

const addOIVLWhenNoManagementType = async (goodsReceipt, item, transaction) => {
	console.log('####################################addOIVLWhenNoManagementType#########################');
	let itemMaster = await ItemMaster.findOne({
		where: {
			id: item.itemMasterId
		}
	}).catch((e) => {
		console.log(e);
		throw e;
	});

	let barcode = parseInt(itemMaster.latestBarcode) + 1;

	// Create a new OIVL
	let data = {
		docNum: goodsReceipt.docNum,
		docDate: goodsReceipt.docDate,
		docType: 'PRN',
		documentId: goodsReceipt.id,
		itemMasterId: item.itemMasterId,
		warehouseId: item.warehouseId,
		inQty: item.quantity,
		openQty: item.quantity,
		price: item.price,
		cost: item.price,
		barcode: itemMaster.code.trim() + barcode.toString()
	};

	const existingOIVLBarcode = await OIVL.findOne({
		where: {
			barcode: data.barcode,
			itemMasterId: item.itemMasterId,
			deleted: false
		}
	}).catch((error) => {
		console.log(error);
		throw error;
	});

	if (existingOIVLBarcode && existingOIVLBarcode.id) {
		console.log('Barcode ' + data.barcode + ' already exists.');
		throw 'Barcode ' + data.barcode + ' already exists.';
	}

	const createdOIVL = await OIVL.create(data, {
		transaction
	}).catch((e) => {
		console.log(e);
		throw e;
	});

	//Insert Goods Receipt OIVLs
	await PurchaseGoodsReceiptNoteOIVL.create(
		{
			purchaseGoodsReceiptNoteId: goodsReceipt.id,
			oivlId: createdOIVL.id,
			quantity: item.quantity
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
		.catch((e) => console.log(e));
};

const addOIVLWhenBatch = async (goodsReceipt, lineItem, transaction) => {
	console.log('####################################addOIVLWhenBatch#########################');

	if (lineItem && lineItem.OIVLs && lineItem.OIVLs.length > 0) {
		for (let i = 0; i < lineItem.OIVLs.length; i++) {
			const selectedOIVL = lineItem.OIVLs[i];

			const existingOIVLBarcode = await OIVL.findOne({
				where: {
					barcode: selectedOIVL.barcode,
					itemMasterId: lineItem.itemMasterId,
					deleted: false
				}
			}).catch((error) => {
				console.log(error);
				throw error;
			});

			if (existingOIVLBarcode && existingOIVLBarcode.id) {
				console.log('Barcode ' + selectedOIVL.barcode + ' already exists.');
				throw 'Barcode ' + selectedOIVL.barcode + ' already exists.';
			}

			let data = {
				docNum: goodsReceipt.docNum,
				docDate: goodsReceipt.docDate,
				docType: 'PRN',
				documentId: goodsReceipt.id,
				itemMasterId: lineItem.itemMasterId,
				warehouseId: lineItem.warehouseId,
				inQty: selectedOIVL.quantity,
				openQty: selectedOIVL.quantity,
				price: lineItem.price,
				cost: lineItem.price,
				barcode: selectedOIVL.barcode
			};

			const createdOIVL = await OIVL.create(data, {
				transaction
			}).catch((e) => {
				console.log(e);
				throw e;
			});

			//Insert Production Receipt OIVLs
			await PurchaseGoodsReceiptNoteOIVL.create(
				{
					purchaseGoodsReceiptNoteId: goodsReceipt.id,
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
	} else {
		console.log('No OIVLs selected for an Item which is batch wise managed');
		throw 'No OIVLs selected for an Item which is batch wise managed';
	}
};

const addOIVLWhenSeriallyNumbered = async (goodsReceipt, lineItem, transaction) => {
	console.log('####################################addOIVLWhenSeriallyNumbered#########################');
	let data = {
		docNum: goodsReceipt.docNum,
		docDate: goodsReceipt.docDate,
		docType: 'PRN',
		documentId: goodsReceipt.id,
		itemMasterId: lineItem.itemMasterId,
		warehouseId: lineItem.warehouseId,
		inQty: lineItem.quantity,
		openQty: lineItem.quantity,
		price: lineItem.price,
		cost: lineItem.price
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
		for (let i = 0; i < lineItem.quantity; i++) {
			let barcodeData = {
				barcode: barcodePrefix + initialNumber.toString(),
				oivlId: createdOIVL.id,
				itemMasterId: lineItem.itemMasterId,
				warehouseId: lineItem.warehouseId
			};

			const existingOIVLBarcode = await OIVLBarcodes.findOne({
				where: {
					barcode: barcodePrefix + initialNumber.toString(),
					itemMasterId: lineItem.itemMasterId,
					deletedAt: null
				}
			}).catch((error) => {
				console.log(error);
				throw error;
			});

			if (existingOIVLBarcode && existingOIVLBarcode.id) {
				console.log('Barcode ' + barcodePrefix + ' ' + initialNumber.toString() + ' already exists.');
				throw 'Barcode ' + barcodePrefix + initialNumber.toString() + ' already exists.';
			}

			//Create OIVL Barcode
			const createdOIVLBarcode = await OIVLBarcodes.create(barcodeData, {
				transaction
			}).catch((e) => {
				console.log(e);
				throw e;
			});

			//Insert Goods Receipt OIVLs
			await PurchaseGoodsReceiptNoteOIVL.create(
				{
					purchaseGoodsReceiptNoteId: goodsReceipt.id,
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
		throw 'Barcode prefix & initial number missing.';
	}
};

const updateWarehouseItemPrice = async (goodsReceipt, lineItem, transaction) => {
	console.log('######################updateWarehouseItemPrice###########################');
	let price = 0;
	let itemMaster = await ItemMaster.findOne({
		where: {
			id: lineItem.itemMasterId
		}
	}).catch((e) => {
		console.log(e);
		throw e;
	});

	let convertedReceiptQuantity = await helper.getConvertedQuantity(
		lineItem.uomId,
		lineItem.itemMasterId,
		lineItem.quantity
	);

	if (itemMaster) {
		let oivls = [];

		if (itemMaster.valuationMethod == 'm') {
			// Moving Average
			oivls = await OIVL.findAll({
				where: {
					itemMasterId: lineItem.itemMasterId,
					warehouseId: lineItem.warehouseId,
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

			oivlTotalOpenQty += +convertedReceiptQuantity;

			//Fetch total price
			price = oivls
				.map((oivlObj) => {
					return oivlObj.openQty * oivlObj.price;
				})
				.reduce((a, b) => a + b, 0);

			price += +convertedReceiptQuantity * +lineItem.price;

			//Calculate average price
			price = (price / oivlTotalOpenQty).toFixed(4);
		}

		//Update Warehouse Item Price
		await WarehouseItem.findOne({
			where: {
				itemMasterId: lineItem.itemMasterId,
				warehouseId: lineItem.warehouseId
			}
		})
			.then(async (warehouseItem) => {
				if (warehouseItem) {
					await warehouseItem
						.update(
							{
								price: price && price != 0 ? price : lineItem.price,
								onHand: +warehouseItem.onHand + +convertedReceiptQuantity
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
						itemMasterId: lineItem.itemMasterId,
						warehouseId: lineItem.warehouseId,
						price: lineItem.price,
						onHand: convertedReceiptQuantity
					};

					await WarehouseItem.create(warehouseItemData, {
						transaction
					}).catch((e) => {
						console.log(e);
						throw e;
					});
				}
			})
			.catch((e) => {
				console.log(e);
				throw e;
			});
	}
};

const bulkUpdateWarehouseItemPrice = async (lineItems, transaction) => {
	console.log('###################### bulkUpdateWarehouseItemPrice ###########################');

	for (let i = 0; i < lineItems.length; i++) {
		const lineItem = lineItems[i];

		let price = 0;
		let itemMaster = await ItemMaster.findOne({
			where: {
				id: lineItem.itemMasterId
			},
			transaction
		}).catch((e) => {
			throw e;
		});

		if (!itemMaster) return;

		let convertedReceiptQuantity = await helper.getConvertedQuantity(
			lineItem.uomId,
			lineItem.itemMasterId,
			lineItem.quantity
		);

		let oivls = [];

		if (itemMaster.valuationMethod == 'm') {
			// Moving Average
			oivls = await OIVL.findAll({
				where: {
					itemMasterId: lineItem.itemMasterId,
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

			oivlTotalOpenQty -= +convertedReceiptQuantity;

			//Fetch total price
			price = oivls
				.map((oivlObj) => {
					return oivlObj.openQty * oivlObj.price;
				})
				.reduce((a, b) => a + b, 0);

			price -= +convertedReceiptQuantity * +lineItem.price;

			//Calculate average price
			price = (price / oivlTotalOpenQty).toFixed(4);
		}

		//Update Warehouse Item Price
		const warehouseItem = await WarehouseItem.findOne({
			where: {
				itemMasterId: lineItem.itemMasterId,
				warehouseId: lineItem.warehouseId
			},
			transaction
		}).catch((e) => {
			throw e;
		});

		if (warehouseItem) {
			await warehouseItem
				.update(
					{
						price: price && price != 0 ? price : lineItem.price,
						onHand: +warehouseItem.onHand - +convertedReceiptQuantity
					},
					{
						transaction
					}
				)
				.catch((e) => {
					throw e;
				});
		} else {
			let warehouseItemData = {
				itemMasterId: lineItem.itemMasterId,
				warehouseId: lineItem.warehouseId,
				price: lineItem.price,
				onHand: 0
			};

			await WarehouseItem.create(warehouseItemData, {
				transaction
			}).catch((e) => {
				console.log(e);
				throw e;
			});
		}
	}
};

exports.update = async (req, res, next) => {
	let { purchaseGoodsReceiptNote } = req.body;

	const { PurchaseGoodsReceiptNoteItems } = purchaseGoodsReceiptNote;

	const purchaseGoodsReceiptNoteId = req.params.id;

	let transaction = await db.sequelize.transaction().catch((e) => {
		console.log(e);
		throw e;
	});

	try {
		const existingPurchaseGoodsReceiptNote = await PurchaseGoodsReceiptNote.findOne({
			where: {
				id: purchaseGoodsReceiptNoteId,
				deleted: {
					[Op.eq]: false
				}
			}
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		await existingPurchaseGoodsReceiptNote
			.update(purchaseGoodsReceiptNote, {
				transaction
			})
			.catch((e) => {
				console.log(e);
				throw e;
			});

		if (existingPurchaseGoodsReceiptNote && existingPurchaseGoodsReceiptNote.id) {
			await insertPurchaseGoodsReceiptNoteItems(
				PurchaseGoodsReceiptNoteItems,
				purchaseGoodsReceiptNoteId,
				transaction
			);

			// commit
			await transaction.commit();

			return res.status(200).send({
				purchaseGoodsReceiptNote: existingPurchaseGoodsReceiptNote,
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

const insertPurchaseGoodsReceiptNoteItems = async (
	purchaseGoodsReceiptNoteItems,
	purchaseGoodsReceiptNoteId,
	transaction
) => {
	// const existingPurchaseGoodsReceiptNoteItemIds = await PurchaseGoodsReceiptNoteItems.findAll({
	//         where: {
	//             purchaseGoodsReceiptNoteId: purchaseGoodsReceiptNoteId
	//         },
	//         attributes: ["id"],
	//         raw: true,
	//     })
	//     .catch(error => {
	//         console.log(error)
	//         throw error
	//     })

	for (let i = 0; i < purchaseGoodsReceiptNoteItems.length; i++) {
		let item = purchaseGoodsReceiptNoteItems[i];
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
			const purchaseGoodsReceiptNoteItemObj = await PurchaseGoodsReceiptNoteItem.findOne({
				where: {
					id: item.id
				}
			}).catch((error) => {
				console.log(error);
				throw error;
			});

			if (purchaseGoodsReceiptNoteItemObj)
				await purchaseGoodsReceiptNoteItemObj
					.update(inputParams, {
						transaction
					})
					.catch((error) => {
						console.log(error);
						throw error;
					});
		} else {
			inputParams.purchaseGoodsReceiptNoteId = purchaseGoodsReceiptNoteId;

			await PurchaseGoodsReceiptNoteItem.create(inputParams, {
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
			model: PurchaseGoodsReceiptNoteItem,
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

	await PurchaseGoodsReceiptNote.findOne({
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
				purchaseGoodsReceiptNote: result,
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

exports.destroy = async (req, res) => {
	let transaction;
	try {
		const { id } = req.params;

		transaction = await db.sequelize.transaction().catch((e) => {
			console.log(e);
			throw e;
		});

		// Find the document
		const purchaseGoodsReceiptNote = await PurchaseGoodsReceiptNote.findOne({
			where: {
				id,
				deleted: false
			},
			include: {
				model: PurchaseGoodsReceiptNoteItem
			},
			transaction
		}).catch((error) => {
			console.log(error);
			throw error;
		});

		if (!purchaseGoodsReceiptNote) {
			return res.status(404).send({
				message: 'record Not Found',
				success: false
			});
		}

		// Soft delete the document
		await purchaseGoodsReceiptNote
			.update(
				{
					deleted: true
				},
				{ transaction }
			)
			.catch((error) => {
				console.log(error);
				throw error;
			});

		// Soft delete the created OIVLs
		await OIVL.update(
			{
				deleted: true,
				deletedAt: new Date()
			},
			{
				where: {
					docType: 'PRN',
					documentId: id
				},
				transaction
			}
		).catch((error) => {
			console.log(error);
			throw error;
		});

		// Update the warehouse prices
		await bulkUpdateWarehouseItemPrice(purchaseGoodsReceiptNote.PurchaseGoodsReceiptNoteItems, transaction);

		// commit
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
			error
		});
	}
};

exports.getProductionPlan = async (req, res, next) => {
	let productionPlans = [],
		createdProductions = [];

	purchasePlans = [];

	try {
		const { purchaseGoodsReceiptNotes } = req.body;

		for (let i = 0; i < purchaseGoodsReceiptNotes.length; i++) {
			const purchaseGoodsReceiptNote = await PurchaseGoodsReceiptNote.findOne({
				include: [
					{
						model: PurchaseGoodsReceiptNoteItem
					}
				],
				where: {
					id: purchaseGoodsReceiptNotes[i].id,
					status: 'open',
					deleted: false
				}
			}).catch((e) => {
				console.log(e);
				throw e;
			});

			if (
				purchaseGoodsReceiptNote &&
				purchaseGoodsReceiptNote.PurchaseGoodsReceiptNoteItems &&
				purchaseGoodsReceiptNote.PurchaseGoodsReceiptNoteItems.length > 0
			) {
				for (let j = 0; j < purchaseGoodsReceiptNote.PurchaseGoodsReceiptNoteItems.length; j++) {
					let item = purchaseGoodsReceiptNote.PurchaseGoodsReceiptNoteItems[j];
					let requiredQty = item.quantity;
					let fromBillOfMaterial = false;

					const itemMaster = await ItemMaster.findOne({
						where: {
							id: item.itemMasterId
						}
					}).catch((e) => {
						console.log(e);
						throw e;
					});

					const oivls = await OIVL.findAll({
						where: {
							itemMasterId: item.itemMasterId,
							warehouseId: item.warehouseId,
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
					let totalQuantity = oivls.map((oivlObj) => +oivlObj.openQty).reduce((a, b) => a + b, 0);

					console.log('requiredQty ', requiredQty);
					console.log('totalQuantity ', totalQuantity);

					if (requiredQty > totalQuantity) {
						let neededQty = requiredQty - totalQuantity;

						if (itemMaster.makeBuy == 'make') {
							await generateProductionPlan(
								neededQty,
								item.itemMasterId,
								requiredQty,
								totalQuantity,
								null,
								productionPlans,
								createdProductions,
								fromBillOfMaterial,
								item.purchaseGoodsReceiptNoteId,
								item.id,
								item.warehouseId
							);
						} else if (itemMaster.makeBuy == 'buy') {
							let purchaseParams = {
								itemMaster: itemMaster.name,
								purchaseGoodsReceiptNote:
									purchaseGoodsReceiptNote.series + ' ' + purchaseGoodsReceiptNote.docNum,
								purchaseGoodsReceiptNoteId: purchaseGoodsReceiptNote.id,
								purchaseGoodsReceiptNoteItemId: item.id,
								itemMasterId: item.itemMasterId,
								quantity: neededQty,
								uomId: item.uomId,
								showToUser: true
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
			purchaseGoodsReceiptNotes: purchaseGoodsReceiptNotes,
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

	if (req.query.purchaseGoodsReceiptNote) {
		include.push({
			model: PurchaseGoodsReceiptNote,
			where: {
				docNum: {
					[Op.iLike]: `%${req.query.purchaseGoodsReceiptNote}%`
				},
				deleted: false
			}
		});
	} else
		include.push({
			model: PurchaseGoodsReceiptNote,
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

	await PurchaseGoodsReceiptNoteItem.findAll({
		include: include,
		distinct: true,
		where: filter,
		order: [ [ 'id', 'ASC' ] ]
	})
		.then(async (results) => {
			return res.send({
				purchaseGoodsReceiptNoteItems: results
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

	let { purchaseGoodsReceiptNotes } = req.body;

	let transaction;

	try {
		transaction = await db.sequelize.transaction().catch((e) => {
			console.log(e);
			throw e;
		});

		let missingBillOfMaterials = [];

		const purchaseGoodsReceiptNotePlan = await createPurchaseGoodsReceiptNotePlan(
			productionPlans,
			purchasePlans,
			purchaseGoodsReceiptNotes,
			transaction
		);

		if (purchaseGoodsReceiptNotePlan && purchaseGoodsReceiptNotePlan.id) {
			await generateProductionOrders(
				productionPlans,
				missingBillOfMaterials,
				purchaseGoodsReceiptNotePlan.id,
				transaction
			);

			if (purchasePlans && purchasePlans.length > 0)
				await generatePurchases(purchasePlans, purchaseGoodsReceiptNotePlan.id, transaction);

			if (purchaseGoodsReceiptNotes && purchaseGoodsReceiptNotes.length > 0)
				await updatePurchaseGoodsReceiptNoteStatusAfterProductionGeneraion(
					purchaseGoodsReceiptNotes,
					transaction
				);
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
	purchaseGoodsReceiptNoteId,
	purchaseGoodsReceiptNoteItemId,
	warehouseId
) => {
	const itemMaster = await ItemMaster.findOne({
		where: {
			id: itemMasterId
		}
	}).catch((e) => {
		console.log(e);
		throw e;
	});

	if (!itemMaster) return;

	const productionParams = {
		itemMasterId: itemMasterId,
		itemMasterCode: itemMaster.code,
		itemMasterName: itemMaster.name,
		warehouseId: warehouseId,
		requiredQty: requiredQty,
		availableQty: totalQuantity,
		productionQty: productionQty,
		dueDate: dueDate,
		purchaseGoodsReceiptNotes: [
			{
				id: purchaseGoodsReceiptNoteId
			}
		],
		purchaseGoodsReceiptNoteItems: purchaseGoodsReceiptNoteItemId ? [ purchaseGoodsReceiptNoteItemId ] : []
	};

	if (createdProductions.indexOf(itemMasterId) !== -1 && fromBillOfMaterial) {
		console.log('Duplicate items found in production order!!!');
		return;
	}

	if (fromBillOfMaterial) productionParams.showToUser = false;
	else productionParams.showToUser = true;

	if (productionPlans && productionPlans.length > 0) {
		let itemExist = false;
		for (let i = 0; i < productionPlans.length; i++) {
			let productionPlan = productionPlans[i];

			if (productionPlan.itemMasterId && +productionPlan.itemMasterId === +itemMasterId) {
				// Item master already exist
				itemExist = true;
				productionPlan.requiredQty = +productionPlan.requiredQty + +requiredQty;
				productionPlan.productionQty = +productionPlan.productionQty + +productionQty;
				productionPlan.purchaseGoodsReceiptNotes.push({
					id: purchaseGoodsReceiptNoteId
				});

				if (purchaseGoodsReceiptNoteItemId)
					productionPlan.purchaseGoodsReceiptNoteItems.push(purchaseGoodsReceiptNoteItemId);
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
				model: BOMComponent
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
			let item = billOfMaterial.BOMComponents[i];
			let requiredQty = +item.quantityPerUnit * +productionQty;

			const oivls = await OIVL.findAll({
				where: {
					itemMasterId: item.productId,
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
			let totalQuantity = oivls.map((oivlObj) => +oivlObj.openQty).reduce((a, b) => a + b, 0);

			if (requiredQty > totalQuantity) {
				let neededQty = requiredQty - totalQuantity;

				if (itemMaster.makeBuy == 'make') {
					await generateProductionPlan(
						neededQty,
						+item.productId,
						requiredQty,
						totalQuantity,
						dueDate,
						productionPlans,
						createdProductions,
						fromBillOfMaterial,
						purchaseGoodsReceiptNoteId,
						purchaseGoodsReceiptNoteItemId,
						item.warehouseId
					);
				}
			}
		}
	} else {
		console.log(
			'##########################purchasePlansFromBillofMaterials#################################################'
		);
		const purchaseGoodsReceiptNote = await PurchaseGoodsReceiptNote.findOne({
			where: {
				id: purchaseGoodsReceiptNoteId
			}
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		const purchaseGoodsReceiptNoteItem = await PurchaseGoodsReceiptNoteItem.findOne({
			where: {
				id: purchaseGoodsReceiptNoteItemId
			}
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		let purchaseParams = {
			itemMaster: itemMaster.name,
			purchaseGoodsReceiptNote:
				purchaseGoodsReceiptNote && purchaseGoodsReceiptNote.id
					? purchaseGoodsReceiptNote.series + ' ' + purchaseGoodsReceiptNote.docNum
					: null,
			purchaseGoodsReceiptNoteId: purchaseGoodsReceiptNoteId,
			purchaseGoodsReceiptNoteItemId: purchaseGoodsReceiptNoteItem.id,
			itemMasterId: itemMaster.id,
			quantity: productionQty,
			uomId: purchaseGoodsReceiptNoteItem.uomId
		};

		if (fromBillOfMaterial) purchaseParams.showToUser = false;
		else purchaseParams.showToUser = true;

		if (itemMaster.makeBuy == 'buy') {
			purchasePlans.push(purchaseParams);
		}
	}
};

const createPurchaseGoodsReceiptNotePlan = async (
	productionPlans,
	purchasePlans,
	purchaseGoodsReceiptNotes,
	transaction
) => {
	const nextDocNo = await helper.getNextDocumentNumber('SOP', 'BRST15');

	try {
		let params = {
			docNum: nextDocNo.nextNumber,
			series: 'BRST15',
			docDate: Date.now(),
			branchId: null,
			purchaseGoodsReceiptNotes: purchaseGoodsReceiptNotes
		};

		let purchaseGoodsReceiptNotePlanProductions = [];
		productionPlans.forEach((item) => {
			if (item.itemMasterId) {
				purchaseGoodsReceiptNotePlanProductions.push({
					itemMasterId: item.itemMasterId,
					warehouseId: item.warehouseId,
					requiredQty: item.requiredQty,
					availableQty: item.availableQty,
					productionQty: item.productionQty
				});
			}
		});

		let purchaseGoodsReceiptNotePlanPurchases = [];
		purchasePlans.forEach((item) => {
			if (item.itemMasterId) {
				purchaseGoodsReceiptNotePlanPurchases.push({
					purchaseGoodsReceiptNoteId: item.purchaseGoodsReceiptNoteId,
					purchaseGoodsReceiptNoteItemId: item.purchaseGoodsReceiptNoteItemId,
					itemMasterId: item.itemMasterId,
					uomId: item.uomId,
					quantity: item.quantity
				});
			}
		});

		params = {
			...params,
			PurchaseGoodsReceiptNotePlanProductions: purchaseGoodsReceiptNotePlanProductions,
			PurchaseGoodsReceiptNotePlanPurchases: purchaseGoodsReceiptNotePlanPurchases
		};

		var include = [
			{
				model: PurchaseGoodsReceiptNotePlanProductions
			},
			{
				model: PurchaseGoodsReceiptNotePlanPurchases
			}
		];

		const purchaseGoodsReceiptNotePlan = await PurchaseGoodsReceiptNotePlan.create(params, {
			include: include,
			transaction: transaction
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		return purchaseGoodsReceiptNotePlan;
	} catch (error) {
		throw error;
	}
};

const generateProductionOrders = async (
	productionPlans,
	missingBillOfMaterials,
	purchaseGoodsReceiptNotePlanId,
	transaction
) => {
	for (let j = 0; j < productionPlans.length; j++) {
		let productionPlan = productionPlans[j];
		const productionQty = productionPlan.productionQty;
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

		let params = {
			docNum: nextDocNo.nextNumber,
			series: 'BRST12',
			docDate: moment.now(),
			productId: productionPlan.itemMasterId,
			purchaseGoodsReceiptNoteId: productionPlan.purchaseGoodsReceiptNoteId,
			dueDate: moment.now(),
			plannedQuantity: productionQty,
			uomId: itemMaster.inventoryUOMId,
			statusId: status.planned,
			purchaseGoodsReceiptNotes: productionPlan.purchaseGoodsReceiptNotes,
			warehouseId: productionPlan.warehouseId,
			purchaseGoodsReceiptNotePlanId: purchaseGoodsReceiptNotePlanId
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

const generatePurchases = async (purchasePlans, purchaseGoodsReceiptNotePlanId, transaction) => {
	for (let j = 0; j < purchasePlans.length; j++) {
		let purchasePlan = purchasePlans[j];

		let params = {
			purchaseGoodsReceiptNoteId: purchasePlan.purchaseGoodsReceiptNoteId,
			purchaseGoodsReceiptNoteItemId: purchasePlan.purchaseGoodsReceiptNoteItemId,
			itemMasterId: purchasePlan.itemMasterId,
			quantity: purchasePlan.quantity,
			uomId: purchasePlan.uomId,
			purchaseGoodsReceiptNotePlanId: purchaseGoodsReceiptNotePlanId
		};

		await PurchasePlan.create(params, {
			transaction: transaction
		}).catch((e) => {
			console.log(e);
			throw e;
		});
	}
};

const updatePurchaseGoodsReceiptNoteStatusAfterProductionGeneraion = async (purchaseGoodsReceiptNotes, transaction) => {
	for (let j = 0; j < purchaseGoodsReceiptNotes.length; j++) {
		let purchaseGoodsReceiptNote = purchaseGoodsReceiptNotes[j];

		await PurchaseGoodsReceiptNote.update(
			{
				status: 'Production Generated'
			},
			{
				where: {
					id: purchaseGoodsReceiptNote.id
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

exports.getProductionPlan = async (req, res, next) => {
	let productionPlans = [],
		createdProductions = [];

	purchasePlans = [];

	try {
		const { purchaseGoodsReceiptNotes } = req.body;

		for (let i = 0; i < purchaseGoodsReceiptNotes.length; i++) {
			const purchaseGoodsReceiptNote = await PurchaseGoodsReceiptNote.findOne({
				include: [
					{
						model: PurchaseGoodsReceiptNoteItem
					}
				],
				where: {
					id: purchaseGoodsReceiptNotes[i].id,
					status: 'open',
					deleted: false
				}
			}).catch((e) => {
				console.log(e);
				throw e;
			});

			if (
				purchaseGoodsReceiptNote &&
				purchaseGoodsReceiptNote.PurchaseGoodsReceiptNoteItems &&
				purchaseGoodsReceiptNote.PurchaseGoodsReceiptNoteItems.length > 0
			) {
				for (let j = 0; j < purchaseGoodsReceiptNote.PurchaseGoodsReceiptNoteItems.length; j++) {
					let item = purchaseGoodsReceiptNote.PurchaseGoodsReceiptNoteItems[j];
					let requiredQty = item.quantity;
					let fromBillOfMaterial = false;

					const itemMaster = await ItemMaster.findOne({
						where: {
							id: item.itemMasterId
						}
					}).catch((e) => {
						console.log(e);
						throw e;
					});

					const oivls = await OIVL.findAll({
						where: {
							itemMasterId: item.itemMasterId,
							warehouseId: item.warehouseId,
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
					let totalQuantity = oivls.map((oivlObj) => +oivlObj.openQty).reduce((a, b) => a + b, 0);

					console.log('requiredQty ', requiredQty);
					console.log('totalQuantity ', totalQuantity);

					if (requiredQty > totalQuantity) {
						let neededQty = requiredQty - totalQuantity;

						if (itemMaster.makeBuy == 'make') {
							await generateProductionPlan(
								neededQty,
								item.itemMasterId,
								requiredQty,
								totalQuantity,
								null,
								productionPlans,
								createdProductions,
								fromBillOfMaterial,
								item.purchaseGoodsReceiptNoteId,
								item.id,
								item.warehouseId
							);
						} else if (itemMaster.makeBuy == 'buy') {
							purchasePlans.push({
								itemMaster: itemMaster.name,
								purchaseGoodsReceiptNote:
									purchaseGoodsReceiptNote.series + ' ' + purchaseGoodsReceiptNote.docNum,
								purchaseGoodsReceiptNoteId: purchaseGoodsReceiptNote.id,
								purchaseGoodsReceiptNoteItemId: item.id,
								itemMasterId: item.itemMasterId,
								quantity: neededQty,
								uomId: item.uomId,
								showToUser: true
							});
						}
					}
				}
			}
		}

		return res.status(200).send({
			productionPlans: productionPlans,
			purchasePlans: purchasePlans,
			purchaseGoodsReceiptNotes: purchaseGoodsReceiptNotes,
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
const getFulfillmentData = async (
	purchaseGoodsReceiptNoteItems,
	purchaseGoodsReceiptNoteCount,
	totalRequiredQty,
	totalAvailableQty
) => {
	for (let j = 0; j < purchaseGoodsReceiptNoteItems.length; j++) {
		const purchaseGoodsReceiptNoteItem = purchaseGoodsReceiptNoteItems[j];

		const itemMasterId = purchaseGoodsReceiptNoteItem.itemMasterId;
		let requiredQty = purchaseGoodsReceiptNoteItem.quantity;

		//Calculating the total required quantity
		const uomConversionFactor = await ItemMasterUOMs.findOne({
			where: {
				itemMasterId: itemMasterId,
				uomId: purchaseGoodsReceiptNoteItem.uomId
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

		if (j === purchaseGoodsReceiptNoteItems.length - 1) purchaseGoodsReceiptNoteCount--;
	}
};
