const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const Moment = require("moment");
const xlsx = require("xlsx");

const db = require("../models/index");
const GoodsReceipt = require("../models").GoodsReceipt;
const GoodsReceiptItem = require("../models").GoodsReceiptItem;
const WarehouseItem = require("../models").WarehouseItems;
const ItemMaster = require("../models").ItemMaster;
const Warehouse = require("../models").Warehouse;
const Branch = require("../models").Branch;
const UOM = require("../models").UOM;
const OIVL = require("../models").OIVL;
const OIVLBarcodes = require("../models").OIVLBarcodes;
const TransactionNumber = require("../models").TransactionNumbers;
const GoodsReceiptOIVL = require("../models").GoodsReceiptOIVL;
const _ = require("lodash");
const paginate = require("express-paginate");
const helper = require("../helpers/helper");

exports.list = async (req, res, next) => {
  var filter = [];
  var include = [
    {
      model: GoodsReceiptItem,
      as: "GoodsReceiptItems",
      include: [
        {
          model: ItemMaster,
          as: "ItemMaster",
        },
        {
          model: Warehouse,
          as: "Warehouse",
        },
      ],
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

  let whereCondition = {
    deleted: {
      [Op.eq]: false,
    },
  };
  if (filter.length > 0) {
    whereCondition = {
      [Op.and]: filter,
      deleted: {
        [Op.eq]: false,
      },
    };
  }

  await GoodsReceipt.findAndCountAll({
    // order: [
    //     [req.query.sorted.id, req.query.sorted.desc]
    // ],
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
      const data = JSON.parse(JSON.stringify(results.rows));

      for (var i = 0; i < data.length; i++) {
        let item = data[i];
        const isOIVL = await OIVL.findAll({
          where: {
            documentId: item.id,
            outQty: {
              [Op.gt]: 0,
            },
          },
        }).catch((e) => {
          console.log(e);
          throw e;
        });
        if (isOIVL.length) {
          item.isOIVL = false;
        } else {
          item.isOIVL = true;
        }
      }

      return res.send({
        data: data,
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
  let { goodsReceipt } = req.body;
  const { GoodsReceiptItems } = goodsReceipt;

  let receiptData = _.omit(goodsReceipt, ["GoodsReceiptItems"]);

  const nextDocNo = await getNextDocumentNumber("GRT", goodsReceipt.series);

  let transaction;

  if (nextDocNo) {
    receiptData.docNum = nextDocNo.nextNumber;
    goodsReceipt.docNum = nextDocNo.nextNumber;
  }

  let month = Moment(receiptData.docDate).month() + 1;
  let year = Moment(receiptData.docDate).year();
  let quarter = Moment(receiptData.docDate).quarter();

  receiptData.month = month;
  receiptData.year = year;
  receiptData.quarter = quarter;

  try {
    transaction = await db.sequelize.transaction().catch((e) => {
      console.log(e);
      throw e;
    });

    const newGoodsReceipt = await GoodsReceipt.create(receiptData, {
      transaction,
    }).catch((e) => {
      console.log(e);
      throw e;
    });

    if (newGoodsReceipt.id) {
      for (let i = 0; i < GoodsReceiptItems.length; i++) {
        GoodsReceiptItems[i].goodsReceiptId = newGoodsReceipt.id;

        const goodsReceiptItem = await GoodsReceiptItem.create(
          GoodsReceiptItems[i],
          {
            transaction,
          }
        ).catch((e) => {
          console.log(e);
          throw e;
        });

        // await updateOnHandQuantity(GoodsReceiptItems[i], transaction)

        await addOIVLData(
          newGoodsReceipt,
          goodsReceiptItem.id,
          GoodsReceiptItems[i],
          transaction
        );

        await updateWarehouseItemPrice(
          goodsReceipt,
          GoodsReceiptItems[i],
          transaction
        );
      }

      // commit
      await transaction.commit();

      return res.status(200).send({
        newGoodsReceipt,
        success: true,
        message: "Success",
      });
    } else {
      return res.status(400).send({
        success: false,
        message: "Failed",
      });
    }
  } catch (err) {
    // Rollback transaction only if the transaction object is defined
    if (transaction) await transaction.rollback();
    console.log(err);
    return res.status(400).send({
      success: false,
      message: "Failed",
      error: err,
    });
  }
};

exports.update = async (req, res, next) => {
  let { goodsReceipt } = req.body;
  const { GoodsReceiptItems } = goodsReceipt;

  const goodsReceiptId = req.params.id;

  let transaction = await db.sequelize.transaction().catch((e) => {
    console.log(e);
    throw e;
  });

  await deleteExistingDocument(GoodsReceiptItems, goodsReceiptId, transaction);

  await deleteGoodsReceiptOIVLs(goodsReceiptId, transaction);

  let receiptData = _.omit(goodsReceipt, ["GoodsReceiptItems"]);

  try {
    const newGoodsReceipt = await GoodsReceipt.create(receiptData, {
      transaction,
    }).catch((e) => {
      console.log(e);
      throw e;
    });

    if (newGoodsReceipt.id) {
      for (let i = 0; i < GoodsReceiptItems.length; i++) {
        GoodsReceiptItems[i].goodsReceiptId = newGoodsReceipt.id;

        await GoodsReceiptItem.create(GoodsReceiptItems[i], {
          transaction,
        }).catch((e) => {
          console.log(e);
          throw e;
        });

        await updateOnHandQuantity(GoodsReceiptItems[i], transaction);

        await addOIVLData(newGoodsReceipt, GoodsReceiptItems[i], transaction);

        await updateWarehouseItemPrice(
          goodsReceipt,
          GoodsReceiptItems[i],
          transaction
        );
      }

      // commit
      await transaction.commit();

      return res.status(200).send({
        newGoodsReceipt,
        success: true,
        message: "Success",
      });
    } else {
      return res.status(400).send({
        success: false,
        message: "Failed",
      });
    }
  } catch (err) {
    // Rollback transaction only if the transaction object is defined
    if (transaction) await transaction.rollback();
    console.log(err);
    return res.status(400).send({
      success: false,
      message: "Failed",
      error: err,
    });
  }
};

const updateOnHandQuantity = async (LineItems, transaction) => {
  let receiptQuantity = await helper.getConvertedQuantity(
    LineItems.uomId,
    LineItems.itemMasterId,
    LineItems.quantity
  );
  console.log("receiptQuantity", receiptQuantity);
  await WarehouseItem.findOne({
    where: {
      itemMasterId: LineItems.itemMasterId,
      warehouseId: LineItems.warehouseId,
    },
  })
    .then(async (data) => {
      if (data) {
        await data
          .update(
            {
              onHand: +data.onHand + +receiptQuantity,
            },
            {
              transaction,
            }
          )
          .catch((e) => {
            console.log(e);
            throw e;
          });
      }
      // else {
      //     let warehouseItemData = {
      //         itemMasterId: LineItems.itemMasterId,
      //         warehouseId: LineItems.warehouseId,
      //         price: LineItems.price,
      //         onHand: LineItems.quantity
      //     }
      //     await WarehouseItem.create(warehouseItemData, {
      //         transaction
      //     }).catch(e => {
      //         console.log(e)
      //         throw e
      //     })
      // }
    })
    .catch((e) => {
      console.log(e);
      throw e;
    });
};

const addOIVLData = async (
  goodsReceipt,
  goodsReceiptItemId,
  item,
  transaction
) => {
  console.log(
    "####################################addOIVLData#########################"
  );
  const product = await ItemMaster.findOne({
    where: {
      id: item.itemMasterId,
    },
  });
  if (product && product.id)
    switch (product.managementTypeId) {
      case 1: // Management type is NONE
        await addOIVLWhenNoManagementType(goodsReceipt, item, transaction);
        break;
      case 2: // Management type is BATCH WISE
        await addOIVLWhenBatch(
          goodsReceipt,
          item,
          goodsReceiptItemId,
          transaction
        );
        break;

      case 3: // Management type is SERIALLY NUMBERED
        await addOIVLWhenSeriallyNumbered(goodsReceipt, item, transaction);
        break;

      case 4: // Management type is BATCH WITH BUNDLE
        await addOIVLWhenBatch(
          goodsReceipt,
          item,
          goodsReceiptItemId,
          transaction
        );
        break;

      default:
        await addOIVLWhenNoManagementType(goodsReceipt, item, transaction);
        break;
    }
};

const addOIVLWhenNoManagementType = async (goodsReceipt, item, transaction) => {
  console.log(
    "####################################addOIVLWhenNoManagementType#########################"
  );
  let itemMaster = await ItemMaster.findOne({
    where: {
      id: item.itemMasterId,
    },
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
    docNum: goodsReceipt.docNum,
    docDate: goodsReceipt.docDate,
    docType: "GRT",
    documentId: goodsReceipt.id,
    itemMasterId: item.itemMasterId,
    warehouseId: item.warehouseId,
    inQty: quantityInBaseUnit,
    openQty: quantityInBaseUnit,
    price: priceInBaseUnit || item.unitPrice,
    cost: priceInBaseUnit || item.unitPrice,
    barcode: itemMaster.code.trim() + barcode.toString(),
  };

  const existingOIVLBarcode = await OIVL.findOne({
    where: {
      barcode: data.barcode,
      itemMasterId: item.itemMasterId,
      deleted: false,
    },
  }).catch((error) => {
    console.log(error);
    throw error;
  });

  if (existingOIVLBarcode && existingOIVLBarcode.id) {
    console.log("Barcode " + data.barcode + " already exists.");
    throw "Barcode " + data.barcode + " already exists.";
  }

  const createdOIVL = await OIVL.create(data, {
    transaction,
  }).catch((e) => {
    console.log(e);
    throw e;
  });

  //Insert Goods Receipt OIVLs
  await GoodsReceiptOIVL.create(
    {
      goodsReceiptId: goodsReceipt.id,
      oivlId: createdOIVL.id,
      quantity: item.quantity,
    },
    {
      transaction,
    }
  ).catch((e) => {
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
};

const addOIVLWhenBatch = async (
  goodsReceipt,
  lineItem,
  goodsReceiptItemId,
  transaction
) => {
  console.log(
    "####################################addOIVLWhenBatch#########################"
  );
  // console.log(lineItem.OIVLs);
  if (lineItem && lineItem.OIVLs && lineItem.OIVLs.length > 0) {
    for (let i = 0; i < lineItem.OIVLs.length; i++) {
      const selectedOIVL = lineItem.OIVLs[i];

      let quantityInBaseUnit = await helper.getConvertedQuantity(
        lineItem.uomId,
        lineItem.itemMasterId,
        selectedOIVL.quantity
      );

      const existingOIVL = await OIVL.findOne({
        where: {
          barcode: selectedOIVL.barcode,
          itemMasterId: lineItem.itemMasterId,
          warehouseId: lineItem.warehouseId,
          deleted: false,
        },
      }).catch((error) => {
        console.log(error);
        throw error;
      });

      if (existingOIVL && existingOIVL.id) {
        console.log("Barcode " + selectedOIVL.barcode + " already exists.");

        await updateExistingOIVL({
          existingOIVL,
          quantityInBaseUnit,
          bundleNumbers: selectedOIVL.OIVLBundleNumbers,
          goodsReceiptId: goodsReceipt.id,
          uomId: lineItem.uomId,
          productId: lineItem.itemMasterId,
          goodsReceiptItemId,
          transaction,
        });

        //Insert Goods Receipt OIVLs
        await GoodsReceiptOIVL.create(
          {
            goodsReceiptId: goodsReceipt.id,
            oivlId: existingOIVL.id,
            quantity: selectedOIVL.quantity,
          },
          {
            transaction,
          }
        ).catch((e) => {
          throw e;
        });
      } else {
        let priceInBaseUnit = await helper.getConvertedPrice(
          lineItem.uomId,
          lineItem.itemMasterId,
          lineItem.unitCost
        );

        let data = {
          docNum: goodsReceipt.docNum,
          docDate: goodsReceipt.docDate,
          docType: "GRT",
          documentId: goodsReceipt.id,
          itemMasterId: lineItem.itemMasterId,
          warehouseId: lineItem.warehouseId,
          // inQty: quantityInBaseUnit,
          // openQty: quantityInBaseUnit,
          price: priceInBaseUnit || lineItem.unitPrice,
          cost: priceInBaseUnit || lineItem.unitPrice,
          barcode: selectedOIVL.barcode,
        };

        const createdOIVL = await OIVL.create(data, {
          // include: include,
          transaction,
        }).catch((e) => {
          throw e;
        });

        await updateExistingOIVL({
          existingOIVL: createdOIVL,
          quantityInBaseUnit,
          bundleNumbers: selectedOIVL.OIVLBundleNumbers,
          goodsReceiptId: goodsReceipt.id,
          uomId: lineItem.uomId,
          productId: lineItem.itemMasterId,
          goodsReceiptItemId,
          transaction,
        });

        //Insert Goods Receipt OIVLs
        await GoodsReceiptOIVL.create(
          {
            goodsReceiptId: goodsReceipt.id,
            oivlId: createdOIVL.id,
            quantity: selectedOIVL.quantity,
          },
          {
            transaction,
          }
        ).catch((e) => {
          throw e;
        });
      }
    }
  } else {
    console.log("No OIVLs selected for an Item which is batch wise managed");
    throw "No OIVLs selected for an Item which is batch wise managed";
  }
};

const updateExistingOIVL = async ({
  existingOIVL,
  quantityInBaseUnit,
  bundleNumbers,
  goodsReceiptId,
  uomId,
  productId,
  goodsReceiptItemId,
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
      console.log(e);
      throw e;
    });

  // Insert bundle numbers
  if (bundleNumbers && bundleNumbers.length > 0) {
    for (let i = 0; i < bundleNumbers.length; i++) {
      const bundle = bundleNumbers[i];

      let quantityInBaseUnit = await helper.getConvertedQuantity(
        uomId,
        productId,
        bundle.numberOfPieces
      );

      await db.OIVLBundleNumbers.create(
        {
          goodsReceiptId,
          goodsReceiptItemId,
          numberOfPieces: bundle.numberOfPieces,
          quantityInBaseUnit,
          oivlId: existingOIVL.id,
          bundleNumber: bundle.bundleNumber,
        },
        {
          transaction,
        }
      ).catch((e) => {
        console.log(e);
        throw e;
      });
    }
  }
};

const addOIVLWhenSeriallyNumbered = async (
  goodsReceipt,
  lineItem,
  transaction
) => {
  console.log(
    "####################################addOIVLWhenSeriallyNumbered#########################"
  );
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

  let data = {
    docNum: goodsReceipt.docNum,
    docDate: goodsReceipt.docDate,
    docType: "GRT",
    documentId: goodsReceipt.id,
    itemMasterId: lineItem.itemMasterId,
    warehouseId: lineItem.warehouseId,
    inQty: quantityInBaseUnit,
    openQty: quantityInBaseUnit,
    price: priceInBaseUnit || lineItem.unitPrice,
    cost: priceInBaseUnit || lineItem.unitPrice,
  };

  const createdOIVL = await OIVL.create(data, {
    transaction,
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
        warehouseId: lineItem.warehouseId,
      };

      const existingOIVLBarcode = await OIVLBarcodes.findOne({
        where: {
          barcode: barcodePrefix + initialNumber.toString(),
          itemMasterId: lineItem.itemMasterId,
          deletedAt: null,
        },
      }).catch((error) => {
        console.log(error);
        throw error;
      });

      if (existingOIVLBarcode && existingOIVLBarcode.id) {
        console.log(
          "Barcode " +
            barcodePrefix +
            " " +
            initialNumber.toString() +
            " already exists."
        );
        throw (
          "Barcode " +
          barcodePrefix +
          initialNumber.toString() +
          " already exists."
        );
      }

      //Create OIVL Barcode
      const createdOIVLBarcode = await OIVLBarcodes.create(barcodeData, {
        transaction,
      }).catch((e) => {
        console.log(e);
        throw e;
      });

      //Insert Goods Receipt OIVLs
      await GoodsReceiptOIVL.create(
        {
          goodsReceiptId: goodsReceipt.id,
          oivlId: createdOIVL.id,
          oivlBarcodeId: createdOIVLBarcode.id,
          quantity: 1,
        },
        {
          transaction,
        }
      ).catch((e) => {
        console.log(e);
        throw e;
      });

      initialNumber++;
    }
  } else {
    console.log("Barcode prefix & initial number missing.");
    console.log(lineItem);
    throw "Barcode prefix & initial number missing.";
  }
};

const updateWarehouseItemPrice = async (
  goodsReceipt,
  lineItem,
  transaction
) => {
  console.log(
    "######################updateWarehouseItemPrice###########################"
  );
  let price = 0;
  let itemMaster = await ItemMaster.findOne({
    where: {
      id: lineItem.itemMasterId,
    },
  }).catch((e) => {
    console.log(e);
    throw e;
  });

  let convertedReceiptQuantity = await helper.getConvertedQuantity(
    lineItem.uomId,
    lineItem.itemMasterId,
    lineItem.quantity
  );

  let priceInBaseUnit = await helper.getConvertedPrice(
    lineItem.uomId,
    lineItem.itemMasterId,
    lineItem.unitPrice
  );

  if (itemMaster) {
    let oivls = [];

    const warehouseItem = await WarehouseItem.findOne({
      where: {
        itemMasterId: lineItem.itemMasterId,
        warehouseId: lineItem.warehouseId,
      },
    }).catch((e) => {
      console.log(e);
      throw e;
    });

    if (itemMaster.valuationMethod == "m") {
      // Moving Average
      oivls = await OIVL.findAll({
        where: {
          itemMasterId: lineItem.itemMasterId,
          warehouseId: lineItem.warehouseId,
          openQty: {
            [Op.gt]: 0,
          },
          deleted: false,
        },
      }).catch((e) => {
        console.log(e);
        throw e;
      });

      //Fetch total quantity
      let oivlTotalOpenQty = oivls
        .map((oivlObj) => +oivlObj.openQty)
        .reduce((a, b) => a + b, 0);

      oivlTotalOpenQty += +convertedReceiptQuantity;

      //Fetch total price
      price = oivls
        .map((oivlObj) => {
          return oivlObj.openQty * oivlObj.price;
        })
        .reduce((a, b) => a + b, 0);

      price += +convertedReceiptQuantity * +priceInBaseUnit;

      //Calculate average price
      price = (price / oivlTotalOpenQty).toFixed(4);
    }

    console.log("convertedReceiptQuantity", convertedReceiptQuantity);
    console.log("price", price);

    if (warehouseItem) {
      console.log(
        "########################## warehouse item available ##########################"
      );
      await warehouseItem
        .update(
          {
            price: price && price != 0 ? price : lineItem.unitPrice,
            onHand: +warehouseItem.onHand + +convertedReceiptQuantity,
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
      console.log(
        "########################## No warehouse item ##########################"
      );
      let warehouseItemData = {
        itemMasterId: lineItem.itemMasterId,
        warehouseId: lineItem.warehouseId,
        price: price && price != 0 ? price : lineItem.unitPrice,
        onHand: convertedReceiptQuantity,
      };

      await WarehouseItem.create(warehouseItemData, {
        transaction,
      }).catch((e) => {
        console.log(e);
        throw e;
      });
    }
  }
};

const deleteGoodsReceiptOIVLs = async (goodsReceiptId, transaction) => {
  console.log(
    "############################################deleteGoodsReceiptOIVLs##################################"
  );
  const goodsReceiptOIVLs = await GoodsReceiptOIVL.findAll({
    where: {
      goodsReceiptId: goodsReceiptId,
    },
    attributes: ["oivlId", "oivlBarcodeId", "quantity", "id"],
    raw: true,
  });

  for (let i = 0; i < goodsReceiptOIVLs.length; i++) {
    const item = goodsReceiptOIVLs[i];

    if (item.oivlBarcodeId) {
      // Update OIVL Barcode status
      await OIVLBarcodes.update(
        {
          deletedAt: Moment.now(),
        },
        {
          where: {
            id: item.oivlBarcodeId,
          },
        },
        {
          transaction,
        }
      ).catch((e) => {
        console.log(e);
        throw e;
      });
    }

    // Delete Goods Receipt OIVL
    await GoodsReceiptOIVL.update(
      {
        deletedAt: Moment.now(),
      },
      {
        where: {
          id: item.id,
        },
      },
      {
        transaction,
      }
    ).catch((e) => {
      console.log(e);
      throw e;
    });
  }
};

const deleteExistingDocument = async (
  LineItems,
  goodsReceiptId,
  transaction
) => {
  console.log(
    "######################################deleteExistingDocument###############################################"
  );
  const goodsReceipt = await GoodsReceipt.findOne({
    where: {
      id: goodsReceiptId,
    },
  }).catch((error) => {
    console.log(error);
    throw error;
  });

  await deleteGoodsReceipt(goodsReceipt, transaction);

  await deleteOIVLs(goodsReceipt, transaction);

  await updateWarehouseItemsOnDelete(
    goodsReceipt,
    LineItems,
    goodsReceiptId,
    transaction
  );
};

const deleteGoodsReceipt = async (goodsReceipt, item, transaction) => {
  console.log(
    "######################################deleteGoodsReceipt###############################################"
  );
  const goodsReceiptObj = await GoodsReceipt.findOne({
    where: {
      id: goodsReceipt.id,
      deleted: false,
    },
  }).catch((error) => {
    console.log(error);
    return error;
  });

  if (!goodsReceiptObj) {
    return "record Not Found";
  }

  goodsReceiptObj
    .update(
      {
        deleted: true,
      },
      {
        transaction,
      }
    )
    .catch((e) => console.log(e));
};

const deleteOIVLs = async (goodsReceipt, item, transaction) => {
  console.log(
    "######################################deleteOIVLs###############################################"
  );

  const existingOIVL = await OIVL.findAll({
    where: {
      docType: {
        [Op.eq]: "GRT",
      },
      docNum: {
        [Op.eq]: goodsReceipt.docNum,
      },
      documentId: goodsReceipt.id,
      deleted: false,
    },
    attributes: ["id"],
    raw: true,
  }).catch((error) => {
    console.log(error);
    throw error;
  });

  const ids = existingOIVL.map((data) => {
    return data.id;
  });

  for (let i = 0; i < ids.length; i++) {
    const oivlObj = await OIVL.findOne({
      where: {
        id: {
          [Op.eq]: ids[i],
        },
      },
    }).catch((error) => {
      console.log(error);
      throw error;
    });

    oivlObj
      .update(
        {
          deleted: true,
        },
        {
          transaction,
        }
      )
      .catch((error) => {
        console.log(error);
        throw error;
      });
  }
};

const updateWarehouseItemsOnDelete = async (
  goodsReceipt,
  LineItems,
  goodsReceiptId,
  transaction
) => {
  console.log(
    "######################################updateWarehouseItemsOnDelete###############################################"
  );
  const goodsReceiptItems = await GoodsReceiptItem.findAll({
    where: {
      goodsReceiptId: {
        [Op.eq]: goodsReceiptId,
      },
    },
    attributes: ["itemMasterId", "quantity", "warehouseId"],
    raw: true,
  });

  for (let i = 0; i < goodsReceiptItems.length; i++) {
    const item = goodsReceiptItems[i];

    await WarehouseItem.findOne({
      where: {
        itemMasterId: item.itemMasterId,
        warehouseId: item.warehouseId,
      },
    })
      .then(async (data) => {
        if (data) {
          await data
            .update(
              {
                onHand: +data.onHand - item.quantity,
              },
              {
                transaction,
              }
            )
            .catch((error) => {
              console.log(error);
              throw error;
            });
        }
      })
      .catch((error) => {
        console.log(error);
        throw error;
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

  await GoodsReceipt.findOne({
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
        model: GoodsReceiptItem,
        as: "GoodsReceiptItems",
        include: [
          {
            model: ItemMaster,
            as: "ItemMaster",
          },
          {
            model: Warehouse,
            as: "Warehouse",
          },
        ],
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
        goodsReceipt: result,
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
  const { id } = req.params;

  const isOIVL = await OIVL.findAll({
    where: {
      documentId: id,
      outQty: {
        [Op.gt]: 0,
      },
    },
  }).catch((e) => {
    console.log(e);
    throw e;
  });
  if (isOIVL.length) {
    return res.status(400).send({
      success: false,
      message: "Document can't be deleted.",
    });
  }

  const goodsReceipt = await GoodsReceipt.findOne({
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
        model: GoodsReceiptItem,
        as: "GoodsReceiptItems",
      },
    ],
  }).then((result) => {
    return result;
  });

  let transaction = await db.sequelize.transaction().catch((e) => {
    console.log(e);
    throw e;
  });

  if (goodsReceipt) {
    try {
      await deleteExistingDocument(
        goodsReceipt.GoodsReceiptItem,
        goodsReceipt.id,
        transaction
      );

      await deleteGoodsReceiptOIVLs(goodsReceipt.id, transaction);

      await deleteOIVLBundleNumbers(goodsReceipt.id, transaction);

      await transaction.commit();
    } catch (err) {
      // Rollback transaction only if the transaction object is defined
      if (transaction) await transaction.rollback();
      console.log(err);
      return res.status(400).send({
        success: false,
        message: "Failed",
        error: err,
      });
    }
  } else {
    return res.status(400).send({
      success: false,
      message: "Document not found.",
    });
  }

  return res.status(200).send({
    success: true,
    message: "Success",
  });
};

exports.uploadInventoryExcel = async (req, res, next) => {
  let transaction = await db.sequelize.transaction().catch((e) => {
    console.log(e);
    throw e;
  });

  let processErrors = [],
    createdBOMs = [];

  try {
    var workbook = xlsx.read(req.files.file.data, {
      type: "array",
    });

    var worksheet = workbook.Sheets[workbook.SheetNames[3]];
    let jsonSheet = xlsx.utils.sheet_to_json(worksheet, {
      defval: "",
    });

    let receiptData = {};
    let GoodsReceiptItems = [],
      oivls = [];
    let goodsReceiptItem = {};
    let itemMasterId = null,
      warehouseId = null,
      lineQuantity = 0;

    let month = Moment(receiptData.docDate).month() + 1;
    let year = Moment(receiptData.docDate).year();
    let quarter = Moment(receiptData.docDate).quarter();

    for (let i = 0; i < jsonSheet.length; i++) {
      let item = jsonSheet[i];

      if (item.productId && item.productId != "#") {
        console.log(
          "##################START###################",
          item.productId
        );
        const nextDocNo = await getNextDocumentNumber("GRT", "BRST38");

        if (nextDocNo) receiptData.docNum = nextDocNo.nextNumber;

        receiptData.month = month;
        receiptData.year = year;
        receiptData.quarter = quarter;

        receiptData.series = "BRST38";
        receiptData.docType = "GRT";
        receiptData.branchId = 47;
        receiptData.docDate = new Date();
        receiptData.remarks = "Opening stock populated from excel";

        GoodsReceiptItems = [];
        oivls = [];
        goodsReceiptItem = {};

        itemMasterId = item.productId;
        warehouseId = item.warehouseId;
        lineQuantity = 0;

        lineQuantity += +item.weight;
        goodsReceiptItem.itemMasterId = itemMasterId;
        goodsReceiptItem.warehouseId = warehouseId;
        goodsReceiptItem.uomId = 2;

        oivls.push({
          quantity: item.weight,
          barcode: item.batchNo,
        });
      } else if (item.productId == "#") {
        console.log("##################HASH END###################");
        goodsReceiptItem.quantity = parseFloat(lineQuantity).toFixed(4);
        goodsReceiptItem.OIVLs = oivls;

        GoodsReceiptItems.push(goodsReceiptItem);
        receiptData.GoodsReceiptItems = GoodsReceiptItems;

        console.log(receiptData);
        // console.log(GoodsReceiptItem.OIVLS);

        const newGoodsReceipt = await GoodsReceipt.create(receiptData, {
          transaction,
        }).catch((e) => {
          console.log(e);
          throw e;
        });

        if (newGoodsReceipt.id) {
          for (let i = 0; i < GoodsReceiptItems.length; i++) {
            GoodsReceiptItems[i].goodsReceiptId = newGoodsReceipt.id;

            const goodsReceiptItem = await GoodsReceiptItem.create(
              GoodsReceiptItems[i],
              {
                transaction,
              }
            ).catch((e) => {
              console.log(e);
              throw e;
            });

            await addOIVLData(
              newGoodsReceipt,
              goodsReceiptItem.id,
              GoodsReceiptItems[i],
              transaction
            );

            await updateWarehouseItemPrice(
              null,
              GoodsReceiptItems[i],
              transaction
            );
          }

          // commit
        }
      } else {
        console.log("##################LINE ITEM###################");

        lineQuantity += +item.weight;
        goodsReceiptItem.itemMasterId = itemMasterId;
        goodsReceiptItem.warehouseId = warehouseId;
        goodsReceiptItem.uomId = 2;

        oivls.push({
          quantity: item.weight,
          barcode: item.batchNo,
        });
      }
    }

    transaction.commit();
    res.send({
      success: true,
      createdBOMs: createdBOMs,
      errors: processErrors,
    });
  } catch (error) {
    // Rollback transaction only if the transaction object is defined
    console.log(error);
    if (transaction) await transaction.rollback();

    return res.status(400).send({
      success: false,
      message: "Failed",
      error: error,
      createdBOMs: createdBOMs,
      errors: processErrors,
    });
  }
};

exports.importInventoryFromExcelByCreatingGRT = async (req, res, next) => {
  let transaction = await db.sequelize.transaction().catch((e) => {
    console.log(e);
    throw e;
  });

  let processErrors = [],
    createdItems = [],
    receiptData = {},
    goodsReceiptItems = [],
    oivls = [],
    goodsReceiptItem = {},
    itemMasterId = null,
    warehouseId = null,
    lineQuantity = 0;

  receiptData.docDate = new Date();

  let month = Moment(receiptData.docDate).month() + 1;
  let year = Moment(receiptData.docDate).year();
  let quarter = Moment(receiptData.docDate).quarter();

  try {
    var workbook = xlsx.read(req.files.file.data, {
      type: "array",
    });

    var worksheet = workbook.Sheets[workbook.SheetNames[0]];
    let jsonSheet = xlsx.utils.sheet_to_json(worksheet, {
      defval: "",
    });

    let transaction = await db.sequelize.transaction().catch((e) => {
      console.log(e);
      throw e;
    });

    const nextDocNo = await helper.getNextDocumentNumber("GRT", "BRST12");

    let docNo = 0;

    if (nextDocNo) docNo = nextDocNo.nextNumber - 1;

    for (let i = 0; i < jsonSheet.length; i++) {
      let item = jsonSheet[i];
      docNo++;

      if (!item.code) throw "missing";

      const itemMaster = await ItemMaster.findOne({
        where: {
          code: item.code,
        },
      });

      if (!itemMaster) throw "missing item";

      const uom = await UOM.findOne({
        where: {
          code: item.itemUOM,
        },
      });

      if (!uom) throw "missing uom";

      receiptData.docNum = docNo;
      receiptData.month = month;
      receiptData.year = year;
      receiptData.quarter = quarter;

      receiptData.series = "BRST12";
      receiptData.docType = "GRT";
      receiptData.branchId = 45;
      receiptData.remarks = "Opening stock populated from excel";

      goodsReceiptItems = [];
      oivls = [];
      goodsReceiptItem = {};

      itemMasterId = itemMaster.id;
      warehouseId = 20;
      lineQuantity = 0;

      lineQuantity += +item.quantity;
      goodsReceiptItem.itemMasterId = itemMasterId;
      goodsReceiptItem.warehouseId = 20;
      goodsReceiptItem.uomId = uom.id;

      oivls.push({
        quantity: item.quantity,
        barcode: item.barcode,
      });

      goodsReceiptItem.quantity = parseFloat(+item.quantity).toFixed(4);
      goodsReceiptItem.OIVLs = oivls;

      goodsReceiptItems.push(goodsReceiptItem);
      receiptData.GoodsReceiptItems = goodsReceiptItems;
      console.log("item", item);

      console.log("item.barcode", item.barcode);
      console.log(receiptData);

      const newGoodsReceipt = await GoodsReceipt.create(receiptData, {
        transaction,
      }).catch((e) => {
        console.log(e);
        throw e;
      });

      if (newGoodsReceipt.id) {
        for (let i = 0; i < goodsReceiptItems.length; i++) {
          goodsReceiptItems[i].goodsReceiptId = newGoodsReceipt.id;
          console.log(goodsReceiptItems[i].OIVLS);

          await GoodsReceiptItem.create(goodsReceiptItems[i], {
            transaction,
          }).catch((e) => {
            console.log(e);
            throw e;
          });

          await addOIVLData(newGoodsReceipt, goodsReceiptItems[i], transaction);

          await updateWarehouseItemPrice(
            null,
            goodsReceiptItems[i],
            transaction
          );
        }

        createdItems.push({
          goodsReceiptId: newGoodsReceipt.id,
          item: itemMaster.name,
        });
      }
    }

    // commit
    transaction.commit();

    res.send({
      success: true,
      createdItems,
      errors: processErrors,
    });
  } catch (error) {
    // Rollback transaction only if the transaction object is defined
    console.log(error);
    if (transaction) await transaction.rollback();

    return res.status(400).send({
      success: false,
      message: "Failed",
      error: error,
      createdItems,
      errors: processErrors,
    });
  }
};

exports.updateWarehouseItemPriceTemp = async (req, res) => {
  let transaction;
  try {
    transaction = await db.sequelize.transaction().catch((e) => {
      console.log(e);
      throw e;
    });

    const oivls = await OIVL.findAll({
      attributes: ["itemMasterId", "price", "warehouseId"],
    }).catch((e) => {
      throw e;
    });

    for (let i = 0; i < oivls.length; i++) {
      const oivl = oivls[i];

      if (oivl.itemMasterId && oivl.warehouseId && oivl.price) {
        const warehouseItem = await WarehouseItem.findOne({
          where: {
            warehouseId: oivl.warehouseId,
            itemMasterId: oivl.itemMasterId,
          },
        });

        if (warehouseItem)
          await warehouseItem
            .update(
              {
                price: oivl.price,
              },
              {
                transaction,
              }
            )
            .catch((e) => {
              throw e;
            });
      }
    }

    await transaction.commit();

    return res.status(200).send({
      success: true,
      message: "Success",
    });
  } catch (error) {
    // Rollback transaction only if the transaction object is defined
    console.log(error);
    if (transaction) await transaction.rollback();

    return res.status(400).send({
      success: false,
      message: "Failed",
      error,
    });
  }
};

exports.importInventoryFromExcel = async (req, res, next) => {
  const createdItems = [];
  const { type } = req.params;
  let transaction;
  try {
    var workbook = xlsx.read(req.files.file.data, {
      type: "array",
    });

    var worksheet = workbook.Sheets[workbook.SheetNames[1]];
    let jsonSheet = xlsx.utils.sheet_to_json(worksheet, {
      defval: "",
    });

    transaction = await db.sequelize.transaction().catch((e) => {
      console.log(e);
      throw e;
    });

    for (let i = 0; i < jsonSheet.length; i++) {
      let item = jsonSheet[i];

      if (!item.code) throw "missing";

      let itemMaster = await ItemMaster.findOne({
        where: {
          code: item.code,
        },
      });

      const uom = await UOM.findOne({
        where: {
          code: item.itemUOM,
        },
      });

      if (!uom) throw "missing uom";

      // if (!itemMaster) throw "missing item " + item.code

      if (!itemMaster) {
        const params = {
          code: item.code,
          name: item.name,
          inventoryUOMId: uom.id,
          departmentId: 1,
          categoryId: 4,
          managementTypeId: 2,
          valuationMethod: "m",
          consumptionTypeId: 1,
        };

        switch (type) {
          case "raw":
            params.makeBuy = "buy";
            params.typeId = 1;
            break;

          case "semi":
            params.makeBuy = "make";
            params.typeId = 2;
            break;

          case "finished":
            params.makeBuy = "make";
            params.typeId = 3;
            break;

          default:
            break;
        }

        console.log("params", params);

        itemMaster = await ItemMaster.create(params).catch((e) => {
          throw e;
        });
      }

      let quantity = +item.quantity;

      // if (itemMaster.inventoryUOMId === 1) quantity = +item.quantity * 1000

      const inputData = {
        branchId: 45,
        warehouseId: 20,
        itemMasterId: itemMaster.id,
        inQty: quantity,
        openQty: quantity,
        barcode: item.barcode,
        remarks: "Opening stock populated from excel - 17-02",
        uomId: itemMaster.inventoryUOMId,
        unitPrice: 0,
      };

      if (item.branch == "ST-50") inputData.branchId = 53;
      if (item.warehouse == "Street 50") inputData.warehouseId = 24;

      if (item.branch == "ST-38") inputData.branchId = 47;
      if (item.warehouse == "Street 38") inputData.warehouseId = 22;

      const oivl = await OIVL.create(inputData, {
        transaction,
      }).catch((e) => {
        console.log(e);
        throw e;
      });

      console.log("OIVL inputData", inputData);

      if (oivl) await updateWarehouseItemPrice(null, inputData, transaction);

      createdItems.push({
        oivlId: oivl.id,
        item: itemMaster.name,
        barcode: item.barcode,
      });
    }

    // commit
    transaction.commit();

    res.send({
      success: true,
      createdItems,
    });
  } catch (error) {
    // Rollback transaction only if the transaction object is defined
    console.log(error);
    if (transaction) await transaction.rollback();

    return res.status(400).send({
      success: false,
      message: "Failed",
      error,
      createdItems,
    });
  }
};

exports.importFinishedInventoryFromExcel = async (req, res, next) => {
  const createdItems = [];
  let transaction;
  try {
    var workbook = xlsx.read(req.files.file.data, {
      type: "array",
    });

    var worksheet = workbook.Sheets[workbook.SheetNames[0]];
    let jsonSheet = xlsx.utils.sheet_to_json(worksheet, {
      defval: "",
    });

    transaction = await db.sequelize.transaction().catch((e) => {
      console.log(e);
      throw e;
    });

    for (let i = 0; i < jsonSheet.length; i++) {
      let item = jsonSheet[i];

      if (!item.code) throw "missing";

      let itemMaster = await ItemMaster.findOne({
        where: {
          code: item.code,
        },
      });

      const uom = await UOM.findOne({
        where: {
          code: item.itemUOM,
        },
      });

      if (!uom) throw "missing uom";

      if (!itemMaster) {
        itemMaster = await ItemMaster.create({
          code: item.code,
          name: item.name,
          inventoryUOMId: uom.id,
          departmentId: 1,
          categoryId: 4,
          managementTypeId: 2,
          makeBuy: 1,
          valuationMethod: "m",
          consumptionTypeId: 1,
          typeId: 3,
        }).catch((e) => {
          throw e;
        });
      }

      let quantity = +item.quantity;

      const inputData = {
        branchId: 45,
        warehouseId: 20,
        itemMasterId: itemMaster.id,
        inQty: quantity,
        openQty: quantity,
        barcode: item.barcode,
        remarks: "Opening stock populated from excel",
        uomId: itemMaster.inventoryUOMId,
        unitPrice: 0,
      };

      const oivl = await OIVL.create(inputData, {
        transaction,
      }).catch((e) => {
        console.log(e);
        throw e;
      });

      if (oivl) await updateWarehouseItemPrice(null, inputData, transaction);

      createdItems.push({
        oivlId: oivl.id,
        item: itemMaster.name,
        barcode: item.barcode,
      });
    }

    // commit
    transaction.commit();

    res.send({
      success: true,
      createdItems,
    });
  } catch (error) {
    // Rollback transaction only if the transaction object is defined
    console.log(error);
    if (transaction) await transaction.rollback();

    return res.status(400).send({
      success: false,
      message: "Failed",
      error,
      createdItems,
    });
  }
};

exports.updateWarehouseItemQtyTemp = async (req, res) => {
  const { warehouseId, typeId } = req.params;
  let transaction;
  try {
    transaction = await db.sequelize.transaction().catch((e) => {
      console.log(e);
      throw e;
    });

    if (!warehouseId) throw new Error("Please provide warehouseId..");
    if (!typeId) throw new Error("Please provide typeId..");

    const itemMasters = await ItemMaster.findAll({
      where: {
        typeId,
      },
      attributes: ["id", "code"],
    }).catch((e) => {
      throw e;
    });

    for (let i = 0; i < itemMasters.length; i++) {
      const itemMasterId = itemMasters[i].id;

      const oivl = await OIVL.findAll({
        attributes: [
          [Sequelize.fn("sum", Sequelize.col("openQty")), "totalQty"],
        ],
        where: {
          warehouseId,
          itemMasterId,
        },
        raw: true,
        // group: ['itemMasterId', 'warehouseId'],
      });

      const totalQty = oivl[0].totalQty || 0;

      const warehouseItem = await WarehouseItem.findOne({
        where: {
          warehouseId,
          itemMasterId,
        },
      });

      if (warehouseItem) {
        await warehouseItem
          .update(
            {
              onHand: totalQty,
            },
            {
              transaction,
            }
          )
          .catch((e) => {
            throw e;
          });
      } else {
        await WarehouseItem.create(
          {
            onHand: totalQty,
            warehouseId,
            itemMasterId,
            price: 0,
          },
          {
            transaction,
          }
        ).catch((e) => {
          throw e;
        });
      }
    }

    await transaction.commit();

    return res.status(200).send({
      success: true,
      message: "Success",
    });
  } catch (error) {
    // Rollback transaction only if the transaction object is defined
    console.log(error);
    if (transaction) await transaction.rollback();

    return res.status(400).send({
      success: false,
      message: "Failed",
      error,
    });
  }
};

const deleteOIVLBundleNumbers = async (goodsReceiptId, transaction) => {
  return await db.OIVLBundleNumbers.update(
    {
      available: false,
    },
    {
      where: {
        goodsReceiptId: goodsReceiptId,
      },
      transaction,
    }
  ).catch((error) => {
    console.log(error);
    throw error;
  });
};
