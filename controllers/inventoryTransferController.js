const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const db = require("../models/index");
const InventoryTransfer = require("../models").InventoryTransfer;
const InventoryTransferItem = require("../models").InventoryTransferItems;
const WarehouseItem = require("../models").WarehouseItems;
const Warehouse = require("../models").Warehouse;
const ItemMaster = require("../models").ItemMaster;
const Branch = require("../models").Branch;
const OIVL = require("../models").OIVL;
const TransactionNumber = require("../models").TransactionNumbers;
const _ = require("lodash");
const paginate = require("express-paginate");
const helper = require("../helpers/helper");

exports.list = async (req, res, next) => {
  var filter = [];
  var include = [
    {
      model: InventoryTransferItem,
      as: "InventoryTransferItem",
      include: [
        {
          model: ItemMaster,
          as: "ItemMaster",
        },
      ],
    },
    {
      model: Warehouse,
      as: "FromWarehouse",
    },
    {
      model: Warehouse,
      as: "ToWarehouse",
    },
    {
      model: Branch,
      as: "Branch",
    },
  ];

  if (req.query.filtered != undefined) {
    req.query.filtered = JSON.stringify(req.query.filtered);

    var filtered = JSON.parse(req.query.filtered);
    for (var i = 0; i < filtered.length; i++) {
      filtered[i] = JSON.parse(filtered[i]);
    }

    filter = filtered.map((data) => {
      if (data.param == "statusId") {
        return {
          [data.param]: {
            [Op.eq]: data.value,
          },
        };
      } else {
        return {
          [data.param]: {
            [Op.iLike]: `${data.value}%`,
          },
        };
      }
    });
  }

  let whereCondition = { deleted: false };

  if (filter.length > 0) {
    whereCondition = {
      ...whereCondition,
      ...filter,
    };
  }

  await InventoryTransfer.findAndCountAll({
    order: [[req.query.sorted.id, req.query.sorted.desc]],
    include: include,
    distinct: true,
    limit: req.query.limit,
    offset: req.skip,
    where: whereCondition,
    order: [["createdAt", "DESC"]],
  })
    .then(async (results) => {
      const itemCount = results.count;
      const pageCount = Math.ceil(results.count / req.query.limit);

      return res.send({
        data: results.rows,
        pageCount,
        itemCount,
        pages: paginate.getArrayPages(req)(3, pageCount, req.query.page),
      });
    })
    .catch((error) => {
      return res.status(400).send({
        error: error,
      });
    });
};

exports.create = async (req, res, next) => {
  let transaction = await db.sequelize.transaction().catch((e) => {
    console.log(e);
    throw e;
  });

  try {
    let { inventoryTransfer } = req.body;

    const LineItems = inventoryTransfer.InventoryTransferItem;

    let transferData = _.omit(inventoryTransfer, ["LineItems"]);

    const nextDocNo = await getNextDocumentNumber(
      "INT",
      inventoryTransfer.series
    );

    if (nextDocNo) {
      transferData.docNum = nextDocNo.nextNumber;
      inventoryTransfer.docNum = nextDocNo.nextNumber;
    }

    const newTransfer = await InventoryTransfer.create(transferData, {
      transaction,
    }).catch((e) => {
      console.log(e);
      throw e;
    });

    if (!newTransfer) throw new Error("Insertion failed!");

    for (let i = 0; i < LineItems.length; i++) {
      const lineItem = LineItems[i];

      lineItem.inventoryTransferId = newTransfer.id;

      await InventoryTransferItem.create(lineItem).catch((e) => {
        throw e;
      });

      await updateOnHandQuantity(inventoryTransfer, lineItem, transaction);

      await addOIVLData(newTransfer, lineItem, transaction);

      await updateOIVLData(
        lineItem,
        newTransfer.id,
        newTransfer.fromWarehouseId,
        transaction
      );
    }

    // commit
    await transaction.commit();

    return res.status(200).send({
      newTransfer,
      success: true,
      message: "Success",
    });
  } catch (error) {
    // Rollback transaction only if the transaction object is defined
    if (transaction) await transaction.rollback();
    console.log(error);

    return res.status(400).send({
      success: false,
      message: "Failed",
      error,
    });
  }
};

const updateOnHandQuantity = async (
  inventoryTransfer,
  lineItem,
  transaction
) => {
  let quantityInBaseUnit = await helper.getConvertedQuantity(
    lineItem.uomId,
    lineItem.itemMasterId,
    lineItem.quantity
  );

  let priceInBaseUnit = await helper.getConvertedPrice(
    lineItem.uomId,
    lineItem.itemMasterId,
    lineItem.unitPrice
  );

  await WarehouseItem.findOne({
    where: {
      itemMasterId: lineItem.itemMasterId,
      warehouseId: inventoryTransfer.toWarehouseId,
    },
    transaction,
  })
    .then(async (warehouseItem) => {
      if (warehouseItem) {
        await warehouseItem
          .update(
            {
              onHand: +warehouseItem.onHand + +quantityInBaseUnit,
            },
            {
              transaction,
            }
          )
          .catch((e) => {
            throw e;
          });
      } else {
        let warehouseItemData = {
          itemMasterId: lineItem.itemMasterId,
          warehouseId: inventoryTransfer.toWarehouseId,
          onHand: lineItem.quantity,
          price: priceInBaseUnit,
        };
        await WarehouseItem.create(warehouseItemData, {
          transaction,
        }).catch((e) => {
          throw e;
        });
      }
    })
    .catch((e) => {
      throw e;
    });

  await WarehouseItem.findOne({
    where: {
      itemMasterId: lineItem.itemMasterId,
      warehouseId: inventoryTransfer.fromWarehouseId,
    },
  })
    .then(async (warehouseItem) => {
      if (warehouseItem) {
        await warehouseItem
          .update(
            {
              onHand: +warehouseItem.onHand - +quantityInBaseUnit,
            },
            {
              transaction,
            }
          )
          .catch((e) => {
            throw e;
          });
      }
    })
    .catch((e) => {
      throw e;
    });
};

const addOIVLData = async (inventoryTransfer, item, transaction) => {
  console.log(
    "####################################addOIVLData#########################"
  );
  const product = await ItemMaster.findOne({
    where: {
      id: item.itemMasterId,
    },
    transaction,
  });

  if (product && product.id)
    switch (product.managementTypeId) {
      case 1: // Management type is NONE
        await addOIVLWhenNoManagementType(inventoryTransfer, item, transaction);
        break;
      case 2: // Management type is BATCH WISE
        await addOIVLWhenBatch(inventoryTransfer, item, transaction);
        break;
      case 4:
        await addOIVLWhenBatchWithBundle(inventoryTransfer, item, transaction);
        break;
      default:
        await addOIVLWhenNoManagementType(inventoryTransfer, item, transaction);
        break;
    }
};

const addOIVLWhenNoManagementType = async (
  inventoryTransfer,
  item,
  transaction
) => {
  console.log(
    "####################################addOIVLWhenNoManagementType#########################"
  );
  let itemMaster = await ItemMaster.findOne({
    where: {
      id: item.itemMasterId,
    },
    transaction,
  }).catch((e) => {
    console.log(e);
    throw e;
  });

  let barcode = parseInt(itemMaster.latestBarcode) + 1;

  let quantityInBaseUnit = await helper.getConvertedQuantity(
    item.uomId,
    item.itemMasterId,
    item.quantity
  );

  let priceInBaseUnit = await helper.getConvertedPrice(
    item.uomId,
    item.itemMasterId,
    item.unitPrice
  );

  // Create a new OIVL
  let data = {
    docNum: inventoryTransfer.docNum,
    docDate: inventoryTransfer.docDate,
    docType: "INT",
    documentId: inventoryTransfer.id,
    itemMasterId: item.itemMasterId,
    warehouseId: inventoryTransfer.toWarehouseId,
    inQty: quantityInBaseUnit,
    openQty: quantityInBaseUnit,
    price: priceInBaseUnit || item.unitPrice,
    cost: priceInBaseUnit || item.unitPrice,
    barcode: itemMaster.code.trim() + barcode.toString(),
  };

  let oivl = await OIVL.findOne({
    where: {
      barcode: data.barcode,
      itemMasterId: item.itemMasterId,
      warehouseId: inventoryTransfer.toWarehouseId,
      deleted: false,
    },
    transaction,
  }).catch((error) => {
    console.log(error);
    throw error;
  });

  if (oivl && oivl.id) {
    await existingOIVLBarcode
      .update(
        {
          inQty: oivl.inQty + quantityInBaseUnit,
          openQty: oivl.openQty + quantityInBaseUnit,
        },
        {
          transaction,
        }
      )
      .catch((e) => {
        console.log(e);
        throw e;
      });
  } else {
    oivl = await OIVL.create(data, {
      transaction,
    }).catch((e) => {
      console.log(e);
      throw e;
    });

    //Update latest barcode
    await itemMaster
      .update(
        {
          latestBarcode: barcode,
        },
        {
          transaction,
        }
      )
      .catch((e) => console.log(e));
  }

  //Insert Transfer OIVLs
  await db.InventoryTransferOIVL.create(
    {
      inventoryTransferId: inventoryTransfer.id,
      oivlId: oivl.id,
      inQty: quantityInBaseUnit,
    },
    {
      transaction,
    }
  ).catch((e) => {
    throw e;
  });
};

const addOIVLWhenBatch = async (inventoryTransfer, lineItem, transaction) => {
  console.log(
    "####################################addOIVLWhenBatch#########################"
  );

  if (lineItem && lineItem.OIVLs && lineItem.OIVLs.length > 0) {
    for (let i = 0; i < lineItem.OIVLs.length; i++) {
      const selectedOIVL = lineItem.OIVLs[i];

      if (!selectedOIVL.quantity) continue;

      let oivl = await OIVL.findOne({
        where: {
          barcode: selectedOIVL.barcode.toString(),
          itemMasterId: lineItem.itemMasterId,
          warehouseId: inventoryTransfer.toWarehouseId,
          deleted: false,
        },
        transaction,
      }).catch((error) => {
        console.log(error);
        throw error;
      });

      var quantityInBaseUnit = await helper.getConvertedQuantity(
        lineItem.uomId,
        lineItem.itemMasterId,
        selectedOIVL.quantity
      );

      var priceInBaseUnit = await helper.getConvertedPrice(
        lineItem.uomId,
        lineItem.itemMasterId,
        lineItem.unitPrice
      );

      if (oivl && oivl.id) {
        await oivl
          .increment(
            {
              inQty: quantityInBaseUnit,
              openQty: quantityInBaseUnit,
            },
            {
              transaction,
            }
          )
          .catch((e) => {
            throw e;
          });
      } else {
        let data = {
          docNum: inventoryTransfer.docNum,
          docDate: inventoryTransfer.docDate,
          docType: "INT",
          documentId: inventoryTransfer.id,
          itemMasterId: lineItem.itemMasterId,
          warehouseId: inventoryTransfer.toWarehouseId,
          inQty: quantityInBaseUnit,
          openQty: quantityInBaseUnit,
          price: priceInBaseUnit || lineItem.unitPrice,
          cost: priceInBaseUnit || lineItem.unitPrice,
          barcode: selectedOIVL.barcode,
          docDate: inventoryTransfer.docDate,
        };

        oivl = await OIVL.create(data, {
          transaction,
        }).catch((e) => {
          console.log(e);
          throw e;
        });
      }

      //Insert Transfer OIVLs
      await db.InventoryTransferOIVL.create(
        {
          inventoryTransferId: inventoryTransfer.id,
          oivlId: oivl.id,
          inQty: quantityInBaseUnit,
        },
        {
          transaction,
        }
      ).catch((e) => {
        throw e;
      });
    }
  } else {
    throw "No OIVLs selected for an Item which is batch wise managed";
  }
};

const addOIVLWhenBatchWithBundle = async (
  inventoryTransfer,
  lineItem,
  transaction
) => {
  console.log(
    "####################################addOIVLWhenBatchWithBundle#########################"
  );

  if (lineItem && lineItem.OIVLs && lineItem.OIVLs.length > 0) {
    for (let i = 0; i < lineItem.OIVLs.length; i++) {
      const selectedOIVL = lineItem.OIVLs[i];

      let fromWarehouseOIVL = await OIVL.findOne({
        where: {
          id: selectedOIVL.oivlId,
          deleted: false,
        },
        attributes: ["barcode"],
        transaction,
      }).catch((error) => {
        throw error;
      });

      let priceInBaseUnit = await helper.getConvertedPrice(
        lineItem.uomId,
        lineItem.itemMasterId,
        lineItem.unitPrice
      );

      let toWarehouseOIVL = await OIVL.findOne({
        where: {
          barcode: fromWarehouseOIVL.barcode,
          warehouseId: inventoryTransfer.toWarehouseId,
          deleted: false,
        },
        transaction,
      }).catch((error) => {
        throw error;
      });

	  let quantityInBaseUnit = await helper.getConvertedQuantity(
        lineItem.uomId,
        lineItem.itemMasterId,
        selectedOIVL.numberOfPieces || 0
      
      );

      if (toWarehouseOIVL && toWarehouseOIVL.id) {
        await updateExistingOIVL({
          existingOIVL: toWarehouseOIVL,
          quantityInBaseUnit: quantityInBaseUnit,
          bundleNumber: selectedOIVL.bundleNumber,
          uomId: lineItem.uomId,
          productId: lineItem.itemMasterId,
          productionOrderId: selectedOIVL.productionOrderId,
          productionReceiptId: selectedOIVL.productionReceiptId,
          numberOfPieces: selectedOIVL.numberOfPieces,
          inventoryTransferId: inventoryTransfer.id,
          transaction,
        });
      } else {
        let data = {
          docNum: inventoryTransfer.docNum,
          docDate: inventoryTransfer.docDate,
          docType: "INT",
          documentId: inventoryTransfer.id,
          itemMasterId: lineItem.itemMasterId,
          warehouseId: inventoryTransfer.toWarehouseId,
          price: priceInBaseUnit || lineItem.unitPrice,
          cost: priceInBaseUnit || lineItem.unitPrice,
          barcode: fromWarehouseOIVL.barcode,
          docDate: inventoryTransfer.docDate,
        };

        toWarehouseOIVL = await OIVL.create(data, {
          transaction,
        }).catch((e) => {
          console.log(e);
          throw e;
        });

        await updateExistingOIVL({
          existingOIVL: toWarehouseOIVL,
          quantityInBaseUnit: quantityInBaseUnit,
          bundleNumber: selectedOIVL.bundleNumber,
          uomId: lineItem.uomId,
          productId: lineItem.itemMasterId,
          productionOrderId: selectedOIVL.productionOrderId,
          productionReceiptId: selectedOIVL.productionReceiptId,
          numberOfPieces: selectedOIVL.numberOfPieces,
          inventoryTransferId: inventoryTransfer.id,
          transaction,
        });
      }

      //Insert Transfer OIVLs
      await db.InventoryTransferOIVL.create(
        {
          inventoryTransferId: inventoryTransfer.id,
          oivlId: toWarehouseOIVL.id,
          inQty: quantityInBaseUnit,
        },
        {
          transaction,
        }
      ).catch((e) => {
        throw e;
      });
    }
  } else {
    throw "No OIVLs selected for an Item which is batch wise managed";
  }
};

const updateExistingOIVL = async ({
  existingOIVL,
  quantityInBaseUnit,
  bundleNumber,
  uomId,
  productId,
  productionOrderId,
  productionReceiptId,
  numberOfPieces,
  inventoryTransferId,
  transaction,
}) => {
  console.log(
    "####################################updateExistingOIVL#########################"
  );

  //Update OIVL quantities
  await existingOIVL
    .increment(
      {
        inQty: quantityInBaseUnit,
        openQty: quantityInBaseUnit,
      },
      {
        transaction,
      }
    )
    .catch((e) => {
      throw e;
    });

  // Insert bundle number
  let bundleQuantityInBaseUnit = await helper.getConvertedQuantity(
    uomId,
    productId,
    numberOfPieces
  );

  const bundleCreated = await db.OIVLBundleNumbers.create(
    {
      productionOrderId,
      productionReceiptId,
      inventoryTransferId,
      // productionReceiptItemId: bundle.productionReceiptItemId,
      numberOfPieces,
      quantityInBaseUnit: bundleQuantityInBaseUnit,
      oivlId: existingOIVL.id,
      bundleNumber,
    },
    {
      transaction,
    }
  ).catch((e) => {
    console.log(e);
    throw e;
  });

  //Insert Sales Delivery Note Bundles
  await db.InventoryTransferBundles.create(
    {
      inventoryTransferId,
      oivlId: bundleCreated.oivlId,
      oivlBundleId: bundleCreated.id,
      type: "receipt",
    },
    {
      transaction,
    }
  ).catch((e) => {
    console.log(e);
    throw e;
  });
};

const updateOIVLData = async (
  lineItem,
  inventoryTransferId,
  fromWarehouseId,
  transaction
) => {
  console.log(
    "####################################updateOIVLData#########################"
  );

  const itemMaster = await ItemMaster.findOne({
    where: {
      id: lineItem.itemMasterId,
    },
  });

  if (itemMaster && itemMaster.id)
    switch (itemMaster.managementTypeId) {
      case 1: // Management type is NONE
        await updateOIVLWhenNoManagementType(
          lineItem,
          fromWarehouseId,
          inventoryTransferId,
          transaction
        );
        break;
      case 2: // Management type is BATCH WISE
        await updateOIVLWhenBatch(lineItem, inventoryTransferId, transaction);
        break;

      case 4: // Management type is BATCH WITH BUNDLE
        await updateOIVLWhenBatchWithBundle(
          lineItem,
          inventoryTransferId,
          transaction
        );
        break;

      default:
        await updateOIVLWhenNoManagementType(
          lineItem,
          fromWarehouseId,
          transaction
        );
        break;
    }
};

const updateOIVLWhenNoManagementType = async (
  lineItem,
  fromWarehouseId,
  inventoryTransferId,
  transaction
) => {
  console.log(
    "####################################updateOIVLWhenNoManagementType#########################"
  );
  const oivl = await OIVL.findOne({
    where: {
      itemMasterId: lineItem.itemMasterId,
      warehouseId: fromWarehouseId,
      openQty: {
        [Op.gt]: 0,
      },
      deleted: false,
    },
    transaction,
    order: [["id", "ASC"]],
  });

  if (!oivl) throw "No OIVL found for no batch item!!";

  let quantityInBaseUnit = await helper.getConvertedQuantity(
    lineItem.uomId,
    lineItem.itemMasterId,
    lineItem.quantity
  );

  await oivl
    .update(
      {
        outQty: +oivl.outQty + +quantityInBaseUnit,
        openQty: +oivl.openQty + +quantityInBaseUnit,
      },
      { transaction }
    )
    .catch((e) => {
      throw e;
    });

  //Insert Transfer OIVLs
  await db.InventoryTransferOIVL.create(
    {
      inventoryTransferId,
      oivlId: oivl.id,
      outQty: quantityInBaseUnit,
    },
    {
      transaction,
    }
  ).catch((e) => {
    throw e;
  });
};

const updateOIVLWhenBatch = async (
  lineItem,
  inventoryTransferId,
  transaction
) => {
  console.log(
    "####################################updateOIVLWhenBatch#########################"
  );
  if (lineItem && lineItem.OIVLs && lineItem.OIVLs.length > 0) {
    for (let i = 0; i < lineItem.OIVLs.length; i++) {
      const selectedOIVL = lineItem.OIVLs[i];

      if (!selectedOIVL.quantity) continue;

      const oivl = await OIVL.findOne({
        where: {
          id: selectedOIVL.oivlId,
        },
        transaction,
      });

      if (!oivl) throw new Error("oivl not found!");

      let quantityInBaseUnit = await helper.getConvertedQuantity(
        lineItem.uomId,
        lineItem.itemMasterId,
        selectedOIVL.quantity
      );

      const outQty = parseFloat(oivl.outQty) + parseFloat(quantityInBaseUnit);
      const openQty = parseFloat(oivl.openQty) - parseFloat(quantityInBaseUnit);

      //Update OIVL out quantity & open qty
      await oivl
        .update(
          {
            outQty,
            openQty,
          },
          {
            transaction,
          }
        )
        .catch((e) => {
          console.log(e);
          throw e;
        });

      //Insert Transfer OIVLs
      await db.InventoryTransferOIVL.create(
        {
          inventoryTransferId,
          oivlId: oivl.id,
          outQty: quantityInBaseUnit,
        },
        {
          transaction,
        }
      ).catch((e) => {
        throw e;
      });
    }
  } else {
    console.log("No OIVLs selected for an Item which is batch wise managed");
    throw "No OIVLs selected for an Item which is batch wise managed";
  }
};

const updateOIVLWhenBatchWithBundle = async (
  lineItem,
  inventoryTransferId,
  transaction
) => {
  console.log(
    "####################################updateOIVLWhenBatchWithBundle#########################"
  );
  if (lineItem && lineItem.OIVLs && lineItem.OIVLs.length > 0) {
    for (let i = 0; i < lineItem.OIVLs.length; i++) {
      const selectedOIVLBundle = lineItem.OIVLs[i];     
      
      const oivl = await OIVL.findOne({
        where: {
          id: selectedOIVLBundle.oivlId,
        },
        transaction,
      }).catch((e) => {
        throw e;
      });

      let quantityInBaseUnit = await helper.getConvertedQuantity(
        lineItem.uomId,
        lineItem.itemMasterId,
        selectedOIVLBundle.numberOfPieces
      );

      //Update OIVL out quantity

      await oivl
        .update(
          {
            outQty: +oivl.outQty + +quantityInBaseUnit,
            openQty: +oivl.openQty - +quantityInBaseUnit,
          },
          {
            transaction,
          }
        )
        .catch((e) => {
          throw e;
        });

      //Insert Transfer OIVLs
      await db.InventoryTransferOIVL.create(
        {
          inventoryTransferId,
          oivlId: selectedOIVLBundle.oivlId,
          outQty: quantityInBaseUnit,
        },
        {
          transaction,
        }
      ).catch((e) => {
        throw e;
      });

      //Update Bundle Status
      const piecesDiff =
        +selectedOIVLBundle._numberOfPieces -
        +selectedOIVLBundle.numberOfPieces;
      await db.OIVLBundleNumbers.update(
        {
          available: piecesDiff == 0 ? false : true,
          numberOfPieces: piecesDiff,
        },
        {
          where: {
            id: selectedOIVLBundle.id,
          },
          transaction,
        }
      ).catch((e) => {
        console.log(e);
        throw e;
      });

      //Insert Transfer OIVLs
      await db.InventoryTransferOIVL.create(
        {
          inventoryTransferId,
          oivlId: oivl.id,
          outQty: quantityInBaseUnit,
        },
        {
          transaction,
        }
      ).catch((e) => {
        throw e;
      });

      //Insert Sales Delivery Note Bundles
      await db.InventoryTransferBundles.create(
        {
          inventoryTransferId,
          oivlId: selectedOIVLBundle.oivlId,
          oivlBundleId: selectedOIVLBundle.id,
          type: "issue",
        },
        {
          transaction,
        }
      ).catch((e) => {
        console.log(e);
        throw e;
      });
    }
  } else {
    console.log("No OIVLs selected for an Item which is batch wise managed");
    throw "No OIVLs selected for an Item which is batch wise managed";
  }
};

exports.update = async (req, res, next) => {
  let { inventoryTransfer } = req.body;
  const { LineItems } = inventoryTransfer;

  const inventoryTransferId = req.params.id;

  await deleteExistingDocument(
    inventoryTransfer,
    LineItems,
    inventoryTransferId
  );

  let transferData = _.omit(inventoryTransfer, ["LineItems"]);

  const newTransfer = await InventoryTransfer.create(transferData).catch((e) =>
    console.log(e)
  );

  if (newTransfer.id) {
    for (let i = 0; i < LineItems.length; i++) {
      const lineItem = LineItems[i];

      lineItem.inventoryTransferId = newTransfer.id;

      await InventoryTransferItem.create(lineItem).catch((e) => console.log(e));

      await updateOnHandQuantity(inventoryTransfer, lineItem, transaction);

      await addOIVLData(newTransfer, lineItem, transaction);
    }

    return res.status(200).send(newTransfer);
  } else {
    return res.status(200).send(newTransfer);
  }
};

const deleteExistingDocument = async (inventoryTransfer, transaction) => {
  await deleteInventoryTransfer(inventoryTransfer, transaction);

  await deleteOIVLs(inventoryTransfer, transaction);

  await deleteBundles(inventoryTransfer, transaction);

  await updateWarehouseItemsOnDelete(inventoryTransfer, transaction);
};

const deleteInventoryTransfer = async (inventoryTransfer, transaction) => {
  console.log(
    "##########################deleteInventoryTransfer####################################"
  );

  const inventoryTransferObj = await InventoryTransfer.findOne({
    where: {
      id: inventoryTransfer.id,
    },
    transaction,
  }).catch((error) => {
    throw error;
  });

  if (!inventoryTransferObj) throw new Error("record Not Found");

  await inventoryTransferObj
    .update(
      {
        deleted: true,
      },
      {
        transaction,
      }
    )
    .catch((e) => {
      throw e;
    });
};

const deleteOIVLs = async (inventoryTransfer, transaction) => {
  console.log(
    "##########################deleteOIVLs####################################"
  );

  // InventoryTransferOIVL
  const inventoryTransferOIVLs = await db.InventoryTransferOIVL.findAll({
    where: {
      inventoryTransferId: inventoryTransfer.id,
    },
    transaction,
  }).catch((e) => {
    throw e;
  });

  for (let i = 0; i < inventoryTransferOIVLs.length; i++) {
    const inventoryTransferOIVL = inventoryTransferOIVLs[i];

    const oivl = await db.OIVL.findOne({
      where: {
        id: inventoryTransferOIVL.oivlId,
      },
      transaction,
    }).catch((e) => {
      throw e;
    });

    if (inventoryTransferOIVL.inQty) {
      await oivl
        .update(
          {
            inQty: +oivl.inQty - +inventoryTransferOIVL.inQty,
            openQty: +oivl.openQty - +inventoryTransferOIVL.inQty,
          },
          {
            transaction,
          }
        )
        .catch((e) => {
          throw e;
        });
    }

    if (inventoryTransferOIVL.outQty) {
      await oivl
        .update(
          {
            outQty: +oivl.outQty - +inventoryTransferOIVL.outQty,
            openQty: +oivl.openQty + +inventoryTransferOIVL.outQty,
          },
          {
            transaction,
          }
        )
        .catch((e) => {
          throw e;
        });
    }

    await inventoryTransferOIVL.destroy({ transaction }).catch((e) => {
      throw e;
    });
  }
};

const deleteBundles = async (inventoryTransfer, transaction) => {
  console.log(
    "##########################deleteBundles####################################"
  );

  // InventoryTransferBundles
  const receivedBundles = await db.InventoryTransferBundles.findAll({
    where: {
      inventoryTransferId: inventoryTransfer.id,
      type: "receipt",
    },
    transaction,
  }).catch((e) => {
    throw e;
  });

  const issuedBundles = await db.InventoryTransferBundles.findAll({
    where: {
      inventoryTransferId: inventoryTransfer.id,
      type: "issue",
    },
    transaction,
  }).catch((e) => {
    throw e;
  });

  for (let i = 0; i < receivedBundles.length; i++) {
    const receivedBundle = receivedBundles[i];

    await db.OIVLBundleNumbers.update(
      {
        available: false,
      },
      {
        where: {
          id: receivedBundle.oivlBundleId,
        },
        transaction,
      }
    ).catch((e) => {
      throw e;
    });

    await receivedBundle
      .destroy({
        transaction,
      })
      .catch((e) => {
        throw e;
      });
  }

  for (let i = 0; i < issuedBundles.length; i++) {
    const issuedBundle = issuedBundles[i];

    await db.OIVLBundleNumbers.update(
      {
        available: true,
      },
      {
        where: {
          id: issuedBundle.oivlBundleId,
        },
        transaction,
      }
    ).catch((e) => {
      throw e;
    });

    await issuedBundle
      .destroy({
        transaction,
      })
      .catch((e) => {
        throw e;
      });
  }
};

const updateWarehouseItemsOnDelete = async (inventoryTransfer, transaction) => {
  console.log(
    "##########################updateWarehouseItemsOnDelete####################################"
  );

  const inventoryTransferObj = await InventoryTransfer.findOne({
    where: {
      id: inventoryTransfer.id,
    },
    transaction,
    attributes: ["fromWarehouseId", "toWarehouseId"],
    raw: true,
  }).catch((e) => {
    throw w;
  });

  const inventoryTransferItems = await InventoryTransferItem.findAll({
    where: {
      inventoryTransferId: inventoryTransfer.id,
    },
    attributes: ["itemMasterId", "quantity", "uomId"],
    transaction,
    raw: true,
  }).catch((e) => {
    throw w;
  });

  for (let i = 0; i < inventoryTransferItems.length; i++) {
    const item = inventoryTransferItems[i];

    let quantityInBaseUnit = await helper.getConvertedQuantity(
      item.uomId,
      item.itemMasterId,
      item.quantity
    );

    const toWarehouseItem = await WarehouseItem.findOne({
      where: {
        itemMasterId: item.itemMasterId,
        warehouseId: inventoryTransferObj.toWarehouseId,
      },
      transaction,
    }).catch((e) => {
      throw w;
    });

    const fromWarehouseItem = await WarehouseItem.findOne({
      where: {
        itemMasterId: item.itemMasterId,
        warehouseId: inventoryTransferObj.fromWarehouseId,
      },
      transaction,
    }).catch((e) => {
      throw w;
    });

    if (!toWarehouseItem) throw new Error("To Warehouse not found !");

    if (!fromWarehouseItem) throw new Error("From Warehouse not found !");

    await toWarehouseItem
      .update(
        {
          onHand: +toWarehouseItem.onHand - +quantityInBaseUnit,
        },
        { transaction }
      )
      .catch((e) => {
        throw w;
      });

    await fromWarehouseItem
      .update(
        {
          onHand: +fromWarehouseItem.onHand + +item.quantity,
        },
        { transaction }
      )
      .catch((e) => {
        throw w;
      });
  }
};

async function getNextDocumentNumber(type, series) {
  return await TransactionNumber.findOne({
    where: {
      objectCode: {
        [Op.eq]: type,
      },
      series: {
        [Op.eq]: series,
      },
    },
    attributes: ["nextNumber"],
    raw: true,
  })
    .then((res) => {
      if (!res) {
        return res.status(404).send({
          message: "record Not Found",
        });
      }
      return res;
    })
    .catch((error) => {
      console.log(error);
      return error;
    });
}

exports.getOne = async (req, res, next) => {
  const { id } = req.params;

  await InventoryTransfer.findOne({
    where: {
      id: {
        [Op.eq]: id,
      },
      deleted: {
        [Op.eq]: false,
      },
    },
    include: [
      {
        model: InventoryTransferItem,
        as: "InventoryTransferItem",
        include: [
          {
            model: ItemMaster,
            as: "ItemMaster",
          },
        ],
      },
      {
        model: Warehouse,
        as: "FromWarehouse",
      },
      {
        model: Warehouse,
        as: "ToWarehouse",
      },
      {
        model: Branch,
        as: "Branch",
      },
    ],
  })
    .then((result) => {
      if (!result) {
        return res.status(404).send({
          message: "record Not Found",
          success: false,
        });
      }
      return res.status(200).send({
        inventoryTransfer: result,
        success: true,
        message: "Success",
      });
    })
    .catch((error) =>
      res.status(400).send({
        error,
        success: false,
        message: "Failed",
      })
    );
};

exports.destroy = async (req, res, next) => {
  let transaction = await db.sequelize.transaction().catch((e) => {
    console.log(e);
    throw e;
  });

  try {
    const { id } = req.params;

    const inventoryTransfer = await InventoryTransfer.findOne({
      where: {
        id,
        deleted: false,
      },
      include: [
        {
          model: InventoryTransferItem,
          as: "InventoryTransferItem",
        },
      ],
    }).catch((e) => {
      throw e;
    });

    if (!inventoryTransfer) throw new Error("Document not found.");

    await deleteExistingDocument(inventoryTransfer, transaction);

    // commit
    await transaction.commit();

    return res.status(203).send({
      success: true,
      message: "Success",
    });
  } catch (error) {
    // Rollback transaction only if the transaction object is defined
    if (transaction) await transaction.rollback();
    console.log(error);

    return res.status(400).send({
      success: false,
      message: "Failed",
      error,
    });
  }
};
