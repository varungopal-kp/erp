'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    var newData = [{
        name: "Organization",
        slug: "organization",
      },
      {
        name: "Branch",
        slug: "branch",
      },
      {
        name: "Department",
        slug: "department",
      },
      {
        name: "Users",
        slug: "users",
      },
      {
        name: "Employees",
        slug: "employees",
      },
      {
        name: "Business Partners",
        slug: "business_partners",
      },
      {
        name: "Item Master",
        slug: "item_master",
      },
      {
        name: "Item Category",
        slug: "item_category",
      },
      {
        name: "Item Attribute",
        slug: "item_attribute",
      },
      {
        name: "Warehouse",
        slug: "warehouse",
      },
      {
        name: "Goods Transfer",
        slug: "goods_transfer",
      },
      {
        name: "Goods Receipt",
        slug: "goods_receipt",
      },
      {
        name: "Goods Issue",
        slug: "goods_issue",
      },
      {
        name: "UOM",
        slug: "uom",
      },
      {
        name: "Brand",
        slug: "brand",
      },
      {
        name: "Production Unit",
        slug: "production_unit",
      },
      {
        name: "Work Center",
        slug: "work_center",
      },
      {
        name: "Machine Center",
        slug: "machine_center",
      },
      {
        name: "Bill of Materials",
        slug: "bill_of_materials",
      },
      {
        name: "Production Order",
        slug: "production_order",
      },
      {
        name: "Production Receipt",
        slug: "production_receipt",
      },
      {
        name: "Production Issue",
        slug: "production_issue",
      },
      {
        name: "Sales Order",
        slug: "sales_order",
      },
      {
        name: "Production Order Generation from Sales Order",
        slug: "production_order_generation_from_sales_order",
      },
      {
        name: "Production Order Generation from Category",
        slug: "production_order_generation_from_category",
      },
      {
        name: "Sales Delivery Note",
        slug: "sales_delivery_note",
      },
      {
        name: "Purchase Goods Receipt Note",
        slug: "purchase_goods_receipt_note",
      },
      {
        name: "Settings",
        slug: "settings",
      },
      {
        name: "Reports",
        slug: "reports",
      },
    ];

    return queryInterface.bulkInsert('Modules', newData);
  },

  down: (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.bulkDelete('People', null, {});
    */
  }
};