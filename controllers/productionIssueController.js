const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const Moment = require('moment');
const db = require('../models/index');
const ProductionOrder = require('../models').ProductionOrder;
const ProductionIssue = require('../models').ProductionIssue;
const ProductionIssueItems = require('../models').ProductionIssueItems;
const ProductionOrderComponents = require('../models').ProductionOrderComponents;
const ItemMaster = require('../models').ItemMaster;
const WarehouseItem = require('../models').WarehouseItems;
const UOM = require('../models').UOM;
const Warehouse = require('../models').Warehouse;
const OIVL = require('../models').OIVL;
const OIVLBarcodes = require('../models').OIVLBarcodes;
const ProductionType = require('../models').ProductionType;
const ProductionIssueOIVL = require('../models').ProductionIssueOIVLs;
const _ = require('lodash');
const paginate = require('express-paginate');
const helper = require('../helpers/helper');
const status = require('../config/status');

exports.list = async (req, res, next) => {
	var filter = [];
	var include = [
		// {
		//     model: ProductionOrder,
		// },
		{
			model: ProductionIssueItems,
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

	await ProductionIssue.findAndCountAll({
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
				productionIssues: results.rows,
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
	let { productionIssue } = req.body;

	if (req.headers.user) productionIssue.createdUser = req.headers.user;

	var include = [
		{
			model: ProductionIssueItems,
			required: true
		}
	];

	let transaction;

	const nextDocNo = await helper.getNextDocumentNumber('PIS', productionIssue.series);

	if (nextDocNo) productionIssue.docNum = nextDocNo.nextNumber;

	try {
		transaction = await db.sequelize.transaction().catch((e) => {
			console.log(e);
			throw e;
		});

		const newProductionIssue = await ProductionIssue.create(productionIssue, {
			include,
			transaction
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		if (newProductionIssue && newProductionIssue.id) {
			const productionOrder = await db.ProductionOrder
				.findOne({
					where: {
						id: productionIssue.productionOrderId
					},
					transaction,
					attributes: [ 'id', 'bomId', 'productId', 'defaultComponentIssued' ]
				})
				.catch((e) => {
					throw e;
				});

			await updateProductionOrder(productionOrder, status.componentsIssued, transaction);

			for (let i = 0; i < productionIssue.ProductionIssueItems.length; i++) {
				var lineItem = productionIssue.ProductionIssueItems[i];

				await updateOIVLData(lineItem, newProductionIssue.id, transaction);

				await updateOnHandQuantity(lineItem, transaction);

				await addOIVLData(newProductionIssue, lineItem, transaction);

				await updateIssuedQtyInProductionOrder(lineItem, transaction);

				await updateDefaultComponentIssuedInPOR(productionOrder, lineItem, transaction);
			}
		}
		const message = `${req.user.username ||
			'Unknown user'} issued components against the Production Order on ${Moment().format(
			'DD-MM-YYYY hh:mm:ss A'
		)}`;
		await helper.createProductionOrderLog(
			productionIssue.productionOrderId,
			message,
			req.user.id || null,
			transaction
		);

		await transaction.commit();

		return res.status(200).send({
			productionIssue: newProductionIssue,
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
	let { productionIssue } = req.body;

	const { ProductionIssueItems } = productionIssue;

	const productionIssueId = req.params.id;

	delete productionIssue['docNum'];

	let transaction = await db.sequelize.transaction().catch((e) => {
		console.log(e);
		throw e;
	});

	try {
		const existingProductionIssue = await ProductionIssue.findOne({
			where: {
				id: productionIssueId
			}
		}).catch((e) => {
			console.log(e);
			throw e;
		});

		await existingProductionIssue
			.update(productionIssue, {
				transaction
			})
			.catch((e) => {
				console.log(e);
				throw e;
			});

		if (existingProductionIssue && existingProductionIssue.id) {
			await deleteOIVLs(existingProductionIssue, transaction);

			await deleteProductionIssueOIVLs(existingProductionIssue.id, transaction);

			await updateWarehouseItemsOnDelete(existingProductionIssue.id, transaction);

			await insertProductionOrderItems(
				ProductionIssueItems,
				productionIssueId,
				transaction,
				existingProductionIssue
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
			productionIssue: existingProductionIssue,
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
			model: ProductionIssueItems,
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
		}
	];

	await ProductionIssue.findOne({
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
				productionIssue: result,
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

	const productionIssue = await ProductionIssue.findOne({
		where: {
			id,
			deleted: false
		}
	}).catch((error) => {
		console.log(error);
		throw error;
	});

	if (!productionIssue) {
		return res.status(404).send({
			message: 'record Not Found',
			success: false
		});
	}

	let transaction = await db.sequelize.transaction().catch((e) => {
		console.log(e);
		throw e;
	});

	try {
		await productionIssue
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

		await deleteOIVLs(productionIssue, transaction);

		await updateOIVLsAfterDelete(id, transaction);

		await deleteProductionIssueOIVLs(id, transaction);

		await updateWarehouseItemsOnDelete(id, transaction);

		await updateProductionOrderAfterDelete(productionIssue.productionOrderId, id, transaction);

		const message = `${req.user.username ||
			'Unknown user'} deleted the Production Receipt ${id} on ${Moment().format('DD-MM-YYYY hh:mm:ss A')}`;
		await helper.createProductionOrderLog(
			productionIssue.productionOrderId,
			message,
			req.user.id || null,
			transaction
		);

		// commit
		await transaction.commit();

		return res.status(202).send({
			message: 'Deleted Successfully.',
			success: true
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

exports.productionTypeList = async (req, res, next) => {
	await ProductionType.findAll({
		attributes: [ 'id', 'name' ]
	})
		.then((result) => {
			if (!result) {
				return res.status(404).send({
					message: 'records Not Found',
					success: false
				});
			}
			return res.status(200).send({
				productionTypes: result,
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

const insertProductionOrderItems = async (productionIssueItems, productionIssueId, transaction, productionIssue) => {
	for (let i = 0; i < productionIssueItems.length; i++) {
		const item = productionIssueItems[i];
		var inputParams = {
			productId: item.productId,
			description: item.description,
			warehouseId: item.warehouseId,
			issuedQuantity: item.issuedQuantity,
			uomId: item.uomId,
			plannedQuantity: item.plannedQuantity
		};

		if (item.id) {
			const componentObj = await ProductionIssueItems.findOne({
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
			inputParams.productionIssueId = productionIssueId;

			await ProductionIssueItems.create(inputParams, {
				transaction
			}).catch((e) => {
				console.log(e);
				throw e;
			});
		}

		await updateOnHandQuantity(item, transaction);

		await addOIVLData(productionIssue, item, transaction);

		await updateOIVLData(item, productionIssueId, transaction);
	}
};

const updateIssuedQtyInProductionOrder = async (lineItem, transaction) => {
	console.log('###########################updateIssuedQtyInProductionOrder###################################');

	if (!lineItem.productionOrderComponentId) return;

	let issuedQuantity = await helper.getConvertedQuantity(lineItem.uomId, lineItem.productId, lineItem.issuedQuantity);

	await ProductionOrderComponents.increment(
		{
			issuedQuantity: issuedQuantity
		},
		{
			where: {
				id: lineItem.productionOrderComponentId
			},
			transaction
		}
	).catch((e) => {
		console.log(e);
		throw e;
	});
};

const updateDefaultComponentIssuedInPOR = async (productionOrder, lineItem, transaction) => {
	console.log(
		'##################################updateDefaultComponentIssuedInPOR##########################################'
	);
	// Update the default component issued quantity from different production issues  against the Production Order
	// so that we can calculate the scrap by taking difference between product received and component issued.

	const bom = await db.BillOfMaterials
		.findOne({
			where: {
				productId: productionOrder.productId
			},
			transaction,
			attributes: [ 'id' ]
		})
		.catch((e) => {
			console.log(e);
			throw e;
		});

	if (!bom) throw new Error('BOM not found!');

	const bomComponent = await db.BOMComponents
		.findOne({
			where: {
				bomId: bom.id,
				productId: lineItem.productId,
				isDefault: true
			},
			transaction
		})
		.catch((e) => {
			console.log(e);
			throw e;
		});

	if (bomComponent) {
		// The product issued is the default component
		const itemMaster = await db.ItemMaster
			.findOne({
				where: {
					id: lineItem.productId
				},
				attributes: [ 'inventoryUOMId', 'id' ],
				transaction
			})
			.catch((e) => {
				throw e;
			});

		const quantityInBaseUnit = await helper.getConvertedQuantity(
			lineItem.uomId,
			lineItem.productId,
			lineItem.issuedQuantity
		);

		await productionOrder
			.update(
				{
					defaultComponentIssued: +productionOrder.defaultComponentIssued + +quantityInBaseUnit,
					defaultComponentId: itemMaster.id,
					defaultComponentUOMId: itemMaster.inventoryUOMId
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

const updateOnHandQuantity = async (lineItem, transaction) => {
	console.log('###########################updateOnHandQuantity###################################');
	let issuedQuantity = await helper.getConvertedQuantity(lineItem.uomId, lineItem.productId, lineItem.issuedQuantity);

	await WarehouseItem.decrement(
		{
			onHand: issuedQuantity
		},
		{
			where: {
				itemMasterId: lineItem.productId,
				warehouseId: lineItem.warehouseId
			},
			transaction
		}
	).catch((e) => {
		console.log(e);
		throw e;
	});
};

const addOIVLData = async (productionIssue, item, transaction) => {
	let data = {
		docNum: productionIssue.docNum,
		docDate: productionIssue.docDate,
		docType: 'PIS',
		documentId: productionIssue.id,
		itemMasterId: item.productId,
		warehouseId: item.warehouseId,
		outQty: item.issuedQuantity
	};

	await OIVL.create(data, {
		transaction
	}).catch((e) => {
		console.log(e);
		throw e;
	});
};

const deleteOIVLs = async (productionIssue, transaction) => {
	console.log('################################### deleteOIVLs ################################################');
	await OIVL.update(
		{
			deleted: true,
			deletedAt: new Date()
		},
		{
			where: {
				docType: 'PIS',
				documentId: productionIssue.id,
				deleted: false,
				deletedAt: null
			},
			transaction
		}
	).catch((e) => {
		console.log(e);
		throw e;
	});
};

const updateWarehouseItemsOnDelete = async (productionIssueId, transaction) => {
	console.log(
		'################################### updateWarehouseItemsOnDelete ################################################'
	);

	const productionIssueItems = await ProductionIssueItems.findAll({
		where: {
			productionIssueId: productionIssueId
		},
		attributes: [ 'productId', 'issuedQuantity', 'warehouseId' ],
		raw: true,
		transaction
	});

	for (let i = 0; i < productionIssueItems.length; i++) {
		const item = productionIssueItems[i];

		await WarehouseItem.increment(
			{
				onHand: item.issuedQuantity
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
	}
};

const updateProductionOrder = async (productionOrder, status, transaction) => {
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

const updateOIVLData = async (lineItem, productionIssueId, transaction) => {
	const product = await ItemMaster.findOne({
		where: {
			id: lineItem.productId
		}
	});

	if (product && product.id)
		switch (product.managementTypeId) {
			case 1: // Management type is NONE
				await updateOIVLWhenNoManagementType(lineItem, productionIssueId, transaction);
				break;
			case 2: // Management type is BATCH WISE
				await updateOIVLWhenBatch(lineItem, productionIssueId, transaction);
				break;

			case 3: // Management type is SERIALLY NUMBERED
				await updateOIVLWhenSeriallyNumbered(lineItem, productionIssueId, transaction);
				break;

			default:
				await updateOIVLWhenNoManagementType(lineItem, productionIssueId, transaction);
				break;
		}
};

const updateOIVLWhenNoManagementType = async (lineItem, productionIssueId, transaction) => {
	console.log('####################################updateOIVLWhenNoManagementType#########################');
	const oivlObject = await OIVL.findOne({
		where: {
			itemMasterId: lineItem.productId,
			warehouseId: lineItem.warehouseId,
			openQty: {
				[Op.gt]: 0
			},
			deleted: false
		},
		order: [ [ 'id', 'ASC' ] ]
	});

	if (!oivlObject) throw 'No OIVL found for no batch item!!';

	let issuedQuantity = await helper.getConvertedQuantity(lineItem.uomId, lineItem.productId, lineItem.issuedQuantity);

	await OIVL.increment(
		{
			outQty: issuedQuantity
		},
		{
			where: {
				id: oivlObject.id
			},
			transaction
		}
	).catch((e) => {
		console.log(e);
		throw e;
	});

	await OIVL.decrement(
		{
			openQty: issuedQuantity
		},
		{
			where: {
				id: oivlObject.id
			},
			transaction
		}
	).catch((e) => {
		console.log(e);
		throw e;
	});

	//Insert Production Issue OIVLs
	await ProductionIssueOIVL.create(
		{
			productionIssueId,
			oivlId: oivlObject.id,
			quantity: issuedQuantity
		},
		{
			transaction
		}
	).catch((e) => {
		console.log(e);
		throw e;
	});
};

const updateOIVLWhenBatch = async (lineItem, productionIssueId, transaction) => {
	console.log('####################################updateOIVLWhenBatch#########################');
	if (lineItem && lineItem.OIVLs && lineItem.OIVLs.length > 0) {
		for (let i = 0; i < lineItem.OIVLs.length; i++) {
			const selectedOIVL = lineItem.OIVLs[i];

			let issuedQuantity = await helper.getConvertedQuantity(
				lineItem.uomId,
				lineItem.productId,
				selectedOIVL.quantity
			);

			//Update OIVL out quantity
			await OIVL.increment(
				{
					outQty: issuedQuantity
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
					openQty: issuedQuantity
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
			await ProductionIssueOIVL.create(
				{
					productionIssueId: productionIssueId,
					oivlId: selectedOIVL.oivlId,
					quantity: issuedQuantity
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

const updateOIVLWhenSeriallyNumbered = async (lineItem, productionIssueId, transaction) => {
	console.log('####################################updateOIVLWhenSeriallyNumbered#########################');
	if (lineItem && lineItem.OIVLs && lineItem.OIVLs.length > 0) {
		for (let i = 0; i < lineItem.OIVLs.length; i++) {
			const selectedOIVLBarcode = lineItem.OIVLs[i];
			if (!selectedOIVLBarcode.check) break;

			//Update OIVL out quantity
			await OIVL.increment(
				{
					outQty: 1
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
					openQty: 1
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
			await ProductionIssueOIVL.create(
				{
					productionIssueId: productionIssueId,
					oivlId: selectedOIVLBarcode.oivlId,
					oivlBarcodeId: selectedOIVLBarcode.oivlBarcodeId,
					quantity: 1
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

const deleteProductionIssueOIVLs = async (productionIssueId, transaction) => {
	console.log(
		'############################################ deleteProductionIssueOIVLs ##################################'
	);
	const productionIssueOIVLs = await ProductionIssueOIVL.findAll({
		where: {
			productionIssueId: productionIssueId
		},
		attributes: [ 'oivlId', 'oivlBarcodeId', 'quantity', 'id' ],
		raw: true,
		transaction
	});

	for (let i = 0; i < productionIssueOIVLs.length; i++) {
		const item = productionIssueOIVLs[i];

		if (item.oivlBarcodeId) {
			// Update OIVL Barcode status
			await OIVLBarcodes.update(
				{
					available: true
				},
				{
					where: {
						id: item.oivlBarcodeId
					},
					transaction
				}
			).catch((e) => {
				console.log(e);
				throw e;
			});
		}

		// Increment OIVL Open Qty
		await OIVL.increment(
			{
				openQty: item.quantity
			},
			{
				where: {
					id: item.oivlId
				},
				transaction
			}
		).catch((e) => {
			console.log(e);
			throw e;
		});

		// Decrement OIVL Out Qty
		await OIVL.decrement(
			{
				outQty: item.quantity
			},
			{
				where: {
					id: item.oivlId
				},
				transaction
			}
		).catch((e) => {
			console.log(e);
			throw e;
		});

		// Delete Production Issue OIVL
		await ProductionIssueOIVL.update(
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

const updateOIVLsAfterDelete = async (productionIssueId, transaction) => {
	console.log(
		'################################### updateOIVLsAfterDelete ################################################'
	);

	const oivls = await ProductionIssueOIVL.findAll({
		where: {
			productionIssueId
		},
		attributes: [ 'oivlId', 'quantity', 'oivlBarcodeId' ],
		transaction
	});

	for (let i = 0; i < oivls.length; i++) {
		const item = oivls[i];

		if (item.oivlId) {
			const oivl = await OIVL.findOne(
				{
					where: { id: item.oivlId }
				},
				transaction
			).catch((e) => {
				console.log(e);
				throw e;
			});

			if (oivl) {
				await oivl
					.update(
						{
							outQty: +oivl.outQty - +item.quantity,
							openQty: +oivl.openQty + +item.quantity
						},
						{ transaction }
					)
					.catch((e) => {
						throw e;
					});
			}
		}

		if (item.oivlBarcodeId) {
			await OIVLBarcodes.update(
				{
					available: true
				},
				{
					where: { id: item.oivlBarcodeId },
					transaction
				}
			).catch((e) => {
				throw e;
			});
		}
	}
};

const updateProductionOrderAfterDelete = async (productionOrderId, productionIssueId, transaction) => {
	console.log(
		'################################### updateProductionOrderAfterDelete ################################################'
	);

	const productionOrder = await ProductionOrder.findOne({
		where: {
			id: productionOrderId
		},
		include: {
			model: ProductionOrderComponents,
			attributes: [ 'productId', 'issuedQuantity' ]
		},
		transaction
	}).catch((e) => {
		console.log(e);
		throw e;
	});

	const existingProductionIssue = await ProductionIssue.findOne({
		where: {
			productionOrderId,
			id: {
				[Op.ne]: productionIssueId
			}
		},
		transaction
	});

	if (!existingProductionIssue) {
		await productionOrder
			.update(
				{
					statusId: status.released
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

	const productionIssueItems = await ProductionIssueItems.findAll({
		where: {
			productionIssueId
		},
		attributes: [ 'productId', 'issuedQuantity', 'uomId' ]
	});

	const productionOrderComponents = productionOrder.ProductionOrderComponents;

	if (productionOrderComponents.length && productionIssueItems.length) {
		for (let i = 0; i < productionIssueItems.length; i++) {
			const productionIssueItem = productionIssueItems[i];

			for (let j = 0; j < productionOrderComponents.length; j++) {
				const productionOrderComponent = productionOrderComponents[j];

				if (productionIssueItem.productId === productionOrderComponent.productId) {
					let issuedQuantity = await helper.getConvertedQuantity(
						productionIssueItem.uomId,
						productionIssueItem.productId,
						productionIssueItem.issuedQuantity
					);

					await productionOrderComponent
						.decrement(
							{
								issuedQuantity
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
		}
	}
};
