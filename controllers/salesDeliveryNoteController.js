const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require('../models/index');
const SalesDeliveryNote = require('../models').SalesDeliveryNote;
const SalesDeliveryNoteItem = require('../models').SalesDeliveryNoteItem;
const SalesDeliveryNoteOIVL = require('../models').SalesDeliveryNoteOIVLs;
const SalesDeliveryNoteBundles = require('../models').SalesDeliveryNoteBundles;
const ItemMaster = require('../models').ItemMaster;
const UOM = require('../models').UOM;
const Warehouse = require('../models').Warehouse;
const Branch = require('../models').Branch;
const Currency = require('../models').Currency;
const OIVL = require('../models').OIVL;
const OIVLBundleNumbers = require('../models').OIVLBundleNumbers;
const BusinessPartner = require('../models').BusinessPartner;
const ItemMasterUOMs = require('../models').ItemMasterUOMs;
const WarehouseItem = require('../models').WarehouseItems;
const SalesOrderItem = require('../models').SalesOrderItem;
const OIVLBarcodes = require('../models').OIVLBarcodes;
const _ = require('lodash');
const moment = require('moment');
const paginate = require('express-paginate');
const helper = require('../helpers/helper');
const status = require('../config/status');

exports.list = async (req, res, next) => {
	var filter = [];
	var include = [
		{
			model: SalesDeliveryNoteItem,
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
			salesDeliveryNotes: await SalesDeliveryNote.findAll({
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

	//     const openSalesDeliveryNotes = await getOpenSalesDeliveryNotes(req, res, include)
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

	await SalesDeliveryNote.findAndCountAll({
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
				salesDeliveryNotes: results.rows,
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

exports.openSalesDeliveryNotes = async (req, res, next) => {
	var include = [
		{
			model: SalesDeliveryNoteItem,
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

	let salesDeliveryNotes = await SalesDeliveryNote.findAll({
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

	if (salesDeliveryNotes && salesDeliveryNotes.length > 0) {
		let completeFlag = 0;

		for (let i = 0; i < salesDeliveryNotes.length; i++) {
			let salesDeliveryNote = salesDeliveryNotes[i];
			let salesDeliveryNoteItems = salesDeliveryNotes[i].SalesDeliveryNoteItems;

			let totalRequiredQty = 0,
				totalAvailableQty = 0,
				fulFillment = [];

			if (salesDeliveryNoteItems && salesDeliveryNoteItems.length > 0) {
				let salesDeliveryNoteItemsCount = salesDeliveryNoteItems.length;
				// await getFulfillmentData(salesDeliveryNoteItems, salesDeliveryNoteCount, totalRequiredQty, totalAvailableQty)

				for (let j = 0; j < salesDeliveryNoteItems.length; j++) {
					const salesDeliveryNoteItem = salesDeliveryNoteItems[j];

					const itemMasterId = salesDeliveryNoteItem.itemMasterId;
					let requiredQty = salesDeliveryNoteItem.quantity;

					//Calculating the total required quantity
					const uomConversionFactor = await ItemMasterUOMs.findOne({
						where: {
							itemMasterId: itemMasterId,
							uomId: salesDeliveryNoteItem.uomId
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

					salesDeliveryNoteItemsCount--;
				}

				if (salesDeliveryNoteItemsCount === 0) {
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

					salesDeliveryNote.setDataValue('fulFillment', fulFillment);
					salesDeliveryNote.setDataValue('fulFilled', fulFilled);
				}
			}
		}

		return res.send({
			salesDeliveryNotes: salesDeliveryNotes,
			success: true
		});
	} else {
		return res.send({
			salesDeliveryNotes: [],
			success: true
		});
	}
};

exports.create = async (req, res, next) => {
	let { salesDeliveryNote } = req.body;

	const salesDeliveryNoteItems = salesDeliveryNote.SalesDeliveryNoteItems;

	if (req.headers.user) salesDeliveryNote.createdUser = req.headers.user;

	var include = [
		{
			model: SalesDeliveryNoteItem,
			required: true
		}
	];

	let transaction;

	const nextDocNo = await helper.getNextDocumentNumber('SDN', salesDeliveryNote.series);

	if (nextDocNo) salesDeliveryNote.docNum = nextDocNo.nextNumber;

	salesDeliveryNote.status = 'open';

	let month = moment(salesDeliveryNote.docDate).month() + 1;
	let year = moment(salesDeliveryNote.docDate).year();
	let quarter = moment(salesDeliveryNote.docDate).quarter();

	salesDeliveryNote.month = month;
	salesDeliveryNote.year = year;
	salesDeliveryNote.quarter = quarter;

	try {
		transaction = await db.sequelize.transaction().catch((e) => {
			console.log(e);
			throw e;
		});

		const newSalesDeliveryNote = await SalesDeliveryNote.create(salesDeliveryNote, {
			// include: include,
			transaction: transaction
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		if (newSalesDeliveryNote.id) {
			for (let i = 0; i < salesDeliveryNoteItems.length; i++) {
				let lineItem = salesDeliveryNoteItems[i];
				lineItem.salesDeliveryNoteId = newSalesDeliveryNote.id;

				await SalesDeliveryNoteItem.create(lineItem, {
					transaction
				}).catch((e) => {
					console.log(e);
					throw e;
				});

				await updateOIVLData(lineItem, newSalesDeliveryNote.id, transaction);

				await updateOnHandQuantity(lineItem, transaction);

				await addOIVLData(newSalesDeliveryNote, lineItem, transaction);

				if (lineItem.copiedId) {
					await updateSalesOrderOpenQty(lineItem, transaction);
				}
			}

			// commit
			await transaction.commit();

			return res.status(200).send({
				newSalesDeliveryNote,
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

const updateOIVLData = async (lineItem, salesDeliveryNoteId, transaction) => {
	const itemMaster = await ItemMaster.findOne({
		where: {
			id: lineItem.itemMasterId
		}
	});

	if (itemMaster && itemMaster.id)
		switch (itemMaster.managementTypeId) {
			case 1: // Management type is NONE
				await updateOIVLWhenNoManagementType(lineItem, transaction);
				break;
			case 2: // Management type is BATCH WISE
				await updateOIVLWhenBatch(lineItem, salesDeliveryNoteId, transaction);
				break;

			case 3: // Management type is SERIALLY NUMBERED
				await updateOIVLWhenSeriallyNumbered(lineItem, salesDeliveryNoteId, transaction);
				break;

			case 4: // Management type is BATCH WITH BUNDLE
				await updateOIVLWhenBatchWithBundle(lineItem, salesDeliveryNoteId, transaction);
				break;

			default:
				await updateOIVLWhenNoManagementType(lineItem, transaction);
				break;
		}
};

const updateOIVLWhenNoManagementType = async (lineItem, transaction) => {
	console.log('####################################updateOIVLWhenNoManagementType#########################');
	const oivlObject = await OIVL.findOne({
		where: {
			itemMasterId: lineItem.itemMasterId,
			warehouseId: lineItem.warehouseId,
			openQty: {
				[Op.gt]: 0
			},
			deleted: false
		},
		order: [ [ 'id', 'ASC' ] ]
	});

	if (!oivlObject) throw 'No OIVL found for no batch item!!';

	let quantityInBaseUnit = await helper.getConvertedQuantity(
		lineItem.uomId,
		lineItem.itemMasterId,
		lineItem.quantity
	);

	await oivlObject
		.update(
			{
				outQty: +oivlObject.outQty + +quantityInBaseUnit,
				openQty: +oivlObject.openQty - +quantityInBaseUnit
			},
			{ transaction }
		)
		.catch((e) => {
			console.log(e);
			throw e;
		});
};

const updateOIVLWhenBatch = async (lineItem, salesDeliveryNoteId, transaction) => {
	console.log('####################################updateOIVLWhenBatch#########################');
	if (lineItem && lineItem.OIVLs && lineItem.OIVLs.length > 0) {
		for (let i = 0; i < lineItem.OIVLs.length; i++) {
			const selectedOIVL = lineItem.OIVLs[i];

			let quantityInBaseUnit = await helper.getConvertedQuantity(
				lineItem.uomId,
				lineItem.itemMasterId,
				selectedOIVL.quantity
			);

			//Update OIVL out quantity
			await OIVL.increment(
				{
					outQty: quantityInBaseUnit
				},
				{
					where: {
						id: selectedOIVL.oivlId
					},
					transaction
				}
			).catch((e) => {
				console.log(e);
				throw e;
			});

			//Decrement OIVL open quantity
			await OIVL.decrement(
				{
					openQty: quantityInBaseUnit
				},
				{
					where: {
						id: selectedOIVL.oivlId
					},
					transaction
				}
			).catch((e) => {
				console.log(e);
				throw e;
			});

			//Insert Production Issue OIVLs
			await SalesDeliveryNoteOIVL.create(
				{
					salesDeliveryNoteId: salesDeliveryNoteId,
					oivlId: selectedOIVL.oivlId,
					quantity: quantityInBaseUnit //selectedOIVL.quantity
				},
				{
					transaction
				}
			).catch((e) => {
				console.log(e);
				throw e;
			});

			// // Update Bundles
			// if (selectedOIVL && selectedOIVL.OIVLBundleNumbers && selectedOIVL.OIVLBundleNumbers.length > 0) {
			//     for (let j = 0; j < selectedOIVL.OIVLBundleNumbers.length; j++) {
			//         const oivlBundle = selectedOIVL.OIVLBundleNumbers[j]

			//         //Update Bundle Status
			//         await OIVLBundleNumbers.update({
			//             available: false
			//         }, {
			//             where: {
			//                 id: oivlBundle.id
			//             },
			//             transaction
			//         }).catch(e => {
			//             console.log(e)
			//             throw e
			//         })

			//         //Insert Sales Delivery Note Bundles
			//         await SalesDeliveryNoteBundles.create({
			//             salesDeliveryNoteId: salesDeliveryNoteId,
			//             oivlId: selectedOIVL.oivlId,
			//             oivlBundleId: oivlBundle.id
			//         }, {
			//             transaction
			//         }).catch(e => {
			//             console.log(e)
			//             throw e
			//         })
			//     }
			// }
		}
	} else {
		console.log('No OIVLs selected for an Item which is batch wise managed');
		throw 'No OIVLs selected for an Item which is batch wise managed';
	}
};

const updateOIVLWhenSeriallyNumbered = async (lineItem, salesDeliveryNoteId, transaction) => {
	console.log('####################################updateOIVLWhenSeriallyNumbered#########################');
	if (lineItem && lineItem.OIVLs && lineItem.OIVLs.length > 0) {
		for (let i = 0; i < lineItem.OIVLs.length; i++) {
			const selectedOIVLBarcode = lineItem.OIVLs[i];

			if (!selectedOIVLBarcode.check) break;

			let quantityInBaseUnit = await helper.getConvertedQuantity(lineItem.uomId, lineItem.itemMasterId, 1);

			//Update OIVL out quantity
			await OIVL.increment(
				{
					outQty: quantityInBaseUnit
				},
				{
					where: {
						id: selectedOIVLBarcode.oivlId
					},
					transaction
				}
			).catch((e) => {
				console.log(e);
				throw e;
			});

			//Decrement OIVL open quantity
			await OIVL.decrement(
				{
					openQty: quantityInBaseUnit
				},
				{
					where: {
						id: selectedOIVLBarcode.oivlId
					},
					transaction
				}
			).catch((e) => {
				console.log(e);
				throw e;
			});

			//Update OIVL Barcode status
			await OIVLBarcodes.update(
				{
					available: false
				},
				{
					where: {
						id: selectedOIVLBarcode.oivlBarcodeId
					},
					transaction
				}
			).catch((e) => {
				console.log(e);
				throw e;
			});

			//Insert Production Issue OIVLs
			await SalesDeliveryNoteOIVL.create(
				{
					salesDeliveryNoteId: salesDeliveryNoteId,
					oivlId: selectedOIVLBarcode.oivlId,
					oivlBarcodeId: selectedOIVLBarcode.oivlBarcodeId,
					quantity: quantityInBaseUnit //1
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
		console.log('No OIVL Barcodes selected for an Item which is serially numbered');
		throw 'No OIVL Barcodes selected for an Item which is serially numbered';
	}
};

const updateOIVLWhenBatchWithBundle = async (lineItem, salesDeliveryNoteId, transaction) => {
	console.log('####################################updateOIVLWhenBatchWithBundle#########################');
	if (lineItem && lineItem.OIVLs && lineItem.OIVLs.length > 0) {
		for (let i = 0; i < lineItem.OIVLs.length; i++) {
			const selectedOIVLBundle = lineItem.OIVLs[i];

			//Update OIVL out quantity
			await OIVL.increment(
				{
					outQty: selectedOIVLBundle.quantityInBaseUnit
				},
				{
					where: {
						id: selectedOIVLBundle.oivlId
					},
					transaction
				}
			).catch((e) => {
				console.log(e);
				throw e;
			});

			//Decrement OIVL open quantity
			await OIVL.decrement(
				{
					openQty: selectedOIVLBundle.quantityInBaseUnit
				},
				{
					where: {
						id: selectedOIVLBundle.oivlId
					},
					transaction
				}
			).catch((e) => {
				console.log(e);
				throw e;
			});

			//Insert Sales Deliver OIVLs
			await SalesDeliveryNoteOIVL.create(
				{
					salesDeliveryNoteId: salesDeliveryNoteId,
					oivlId: selectedOIVLBundle.oivlId,
					quantity: selectedOIVLBundle.quantityInBaseUnit
				},
				{
					transaction
				}
			).catch((e) => {
				console.log(e);
				throw e;
			});

			//Update Bundle Status
			await OIVLBundleNumbers.update(
				{
					available: false
				},
				{
					where: {
						id: selectedOIVLBundle.id
					},
					transaction
				}
			).catch((e) => {
				console.log(e);
				throw e;
			});

			//Insert Sales Delivery Note Bundles
			await SalesDeliveryNoteBundles.create(
				{
					salesDeliveryNoteId: salesDeliveryNoteId,
					oivlId: selectedOIVLBundle.oivlId,
					oivlBundleId: selectedOIVLBundle.id
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

const updateOnHandQuantity = async (lineItem, transaction) => {
	console.log('###########################updateOnHandQuantity###################################');
	let quantity = await helper.getConvertedQuantity(lineItem.uomId, lineItem.itemMasterId, lineItem.quantity);
	await WarehouseItem.decrement(
		{
			onHand: quantity
		},
		{
			where: {
				itemMasterId: lineItem.itemMasterId,
				warehouseId: lineItem.warehouseId
			},
			transaction
		}
	).catch((e) => {
		console.log(e);
		throw e;
	});
};

const addOIVLData = async (salesDeliveryNote, item, transaction) => {
	let quantity = await helper.getConvertedQuantity(item.uomId, item.itemMasterId, item.quantity);

	let data = {
		docNum: salesDeliveryNote.docNum,
		docType: 'SDN',
		documentId: salesDeliveryNote.id,
		itemMasterId: item.itemMasterId,
		warehouseId: item.warehouseId,
		outQty: quantity,
		price: item.unitPrice,
		cost: item.unitPrice
	};

	await OIVL.create(data, {
		transaction
	}).catch((e) => {
		console.log(e);
		throw e;
	});
};

const updateSalesOrderOpenQty = async (lineItem, transaction) => {
	console.log('################################updateSalesOrderOpenQty###################################');
	await SalesOrderItem.findOne({
		where: {
			id: lineItem.copiedId
		}
	})
		.then(async (data) => {
			if (data) {
				let copiedQty = +data.copiedQty + +lineItem.quantity;
				let openQty = +data.openQty - +lineItem.quantity;

				await data
					.update(
						{
							copiedQty: +copiedQty,
							openQty: +openQty
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

exports.update = async (req, res, next) => {
	let { salesDeliveryNote } = req.body;

	const { SalesDeliveryNoteItems } = salesDeliveryNote;

	const salesDeliveryNoteId = req.params.id;

	let transaction = await db.sequelize.transaction().catch((e) => {
		console.log(e);
		throw e;
	});

	try {
		const existingSalesDeliveryNote = await SalesDeliveryNote.findOne({
			where: {
				id: salesDeliveryNoteId,
				deleted: {
					[Op.eq]: false
				}
			}
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		await existingSalesDeliveryNote
			.update(salesDeliveryNote, {
				transaction
			})
			.catch((e) => {
				console.log(e);
				throw e;
			});

		if (existingSalesDeliveryNote && existingSalesDeliveryNote.id) {
			await insertSalesDeliveryNoteItems(SalesDeliveryNoteItems, salesDeliveryNoteId, transaction);

			// commit
			await transaction.commit();

			return res.status(200).send({
				salesDeliveryNote: existingSalesDeliveryNote,
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

const insertSalesDeliveryNoteItems = async (salesDeliveryNoteItems, salesDeliveryNoteId, transaction) => {
	// const existingSalesDeliveryNoteItemIds = await SalesDeliveryNoteItems.findAll({
	//         where: {
	//             salesDeliveryNoteId: salesDeliveryNoteId
	//         },
	//         attributes: ["id"],
	//         raw: true,
	//     })
	//     .catch(error => {
	//         console.log(error)
	//         throw error
	//     })

	for (let i = 0; i < salesDeliveryNoteItems.length; i++) {
		let item = salesDeliveryNoteItems[i];
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
			const salesDeliveryNoteItemObj = await SalesDeliveryNoteItem.findOne({
				where: {
					id: item.id
				}
			}).catch((error) => {
				console.log(error);
				throw error;
			});

			if (salesDeliveryNoteItemObj)
				await salesDeliveryNoteItemObj
					.update(inputParams, {
						transaction
					})
					.catch((error) => {
						console.log(error);
						throw error;
					});
		} else {
			inputParams.salesDeliveryNoteId = salesDeliveryNoteId;

			await SalesDeliveryNoteItem.create(inputParams, {
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
			model: SalesDeliveryNoteItem,
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

	await SalesDeliveryNote.findOne({
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
				salesDeliveryNote: result,
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
	let transaction;
	try {
		const { id } = req.params;

		transaction = await db.sequelize.transaction().catch((e) => {
			console.log(e);
			throw e;
		});

		const salesDeliveryNote = await SalesDeliveryNote.findOne({
			include: [
				{
					model: SalesDeliveryNoteItem
				},
				{
					model: SalesDeliveryNoteOIVL
				}
			],
			where: {
				id
			},
			transaction
		}).catch((error) => {
			throw error;
		});

		if (!salesDeliveryNote) {
			return res.status(404).send({
				message: 'record Not Found',
				success: false
			});
		}

		await salesDeliveryNote
			.update(
				{
					deleted: true
				},
				{
					transaction
				}
			)
			.catch((error) => {
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
					docType: 'SDN',
					documentId: id
				},
				transaction
			}
		).catch((error) => {
			throw error;
		});

		await updateBatchesOnDelete(salesDeliveryNote.SalesDeliveryNoteOIVLs, transaction);

		// Update the warehouse prices
		await bulkUpdateWarehouseItemPrice(salesDeliveryNote.SalesDeliveryNoteItems, transaction);

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

const updateBatchesOnDelete = async (salesDeliveryOivls, transaction) => {
	console.log('###################### updateBatchesOnDelete ###########################');

	for (let i = 0; i < salesDeliveryOivls.length; i++) {
		const salesDeliveryOivl = salesDeliveryOivls[i];
		const { oivlId, oivlBarcodeId, quantity } = salesDeliveryOivl;

		const oivl = await OIVL.findOne({
			where: {
				id: oivlId
			},
			transaction
		}).catch((e) => {
			throw e;
		});

		if (!oivl) continue;

		await oivl
			.update(
				{
					outQty: +oivl.outQty - +quantity,
					openQty: +oivl.openQty + +quantity
				},
				{ transaction }
			)
			.catch((e) => {
				console.log(e);
				throw e;
			});

		if (oivlBarcodeId) {
			await OIVLBarcodes.update(
				{
					available: true
				},
				{
					where: {
						id: oivlBarcodeId
					},
					transaction
				}
			).catch((e) => {
				console.log(e);
				throw e;
			});
		}
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
						onHand: +warehouseItem.onHand + +convertedReceiptQuantity
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
};
