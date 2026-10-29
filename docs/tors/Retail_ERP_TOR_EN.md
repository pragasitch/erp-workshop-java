# Retail ERP Terms of Reference

Scope of Work and Business Requirements

Version 1.1 | 23 October 2026 | RetailOne Co Ltd

> Text conversion of `Retail_ERP_TOR_EN.pdf` for agents that cannot read PDFs. The PDF is the authoritative document.

## 1 Background and objectives

RetailOne operates a head office and two stores. Product records, purchase orders, and stock balances are maintained in separate files, making stock checks slow and allowing duplicate goods receipts. The company requires a web application that connects purchasing, receiving, sales, and reporting, with traceable inventory movements.

This Terms of Reference defines the scope, business rules, quality requirements, deliverables, and acceptance conditions for the initial release of the Retail ERP application. The appointed supplier shall design, develop, test, and deliver the system against these requirements. RetailOne shall confirm business decisions and authorize acceptance.

## 2 System scope and users

The system supports one organization, Thai baht, and one base unit per SKU. Stock is tracked separately for each store, which also serves as a stock location. Application screens shall be in Thai, with dates and times displayed in Asia/Bangkok.

| Role               | Responsibilities and permissions                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| Administrator      | Manage users, stores, products, and suppliers. Transaction approval rights are not granted automatically. |
| Purchasing officer | Create and submit purchase orders and view receiving status. Cannot approve purchase orders.              |
| Store employee     | View stock, receive goods, and record sales for their assigned store only.                                |
| Manager            | Approve or reject purchase orders, adjust stock, and view reports across all stores.                      |

## 3 Exclusions

General ledger, accounts payable and receivable, payroll, manufacturing, tax calculation and tax invoices, real payments, external POS or ERP integration, inter-store transfers, batch and expiry tracking, returns, and migration of real business data are excluded. Scope extensions require separate agreement.

## 4 Master data and inventory

### 4.1 Products, stores and suppliers

**MD-01** Create and edit products with SKU, name, category, unit, selling price, active status, and a reorder threshold per store. SKUs must be unique across the organization and cannot change after a transaction exists.

**MD-02** Selling prices and reorder thresholds cannot be negative. Stock quantities must be whole numbers. Products may be deactivated while remaining searchable in historical records. Inactive products cannot be added to new documents.

**MD-03** Maintain store codes and names, supplier codes and names, and supplier contact details. Each purchase order refers to one supplier and one destination store.

### 4.2 Stock balances and movements

**INV-01** Search stock by SKU, product name, and store. Show current quantity, unit, reorder threshold, and low-stock status when quantity is less than or equal to the threshold.

**INV-02** Every stock increase or decrease must record product, store, quantity change, balances before and after, movement type, source document, actor, and timestamp. Confirmed movements cannot be edited or deleted.

**INV-03** Stock balances must equal opening balances plus successful movements and must never be negative. Document posting and stock updates must succeed together or roll back together.

**INV-04** Concurrent transactions for the same product and store must not lose updates. Validate the latest stock balance when confirming a transaction; the balance displayed in the browser is not authoritative.

**INV-05** Managers may increase or decrease stock with a mandatory reason and movement history. Reject reductions greater than the available balance.

### 4.3 Shared data rules

Document numbers must be unique. Changes to master data must not alter the names, prices, or details recorded in historical documents. Store transaction-time snapshots for audit purposes.

Use monetary values with two decimal places. Calculate each line as quantity multiplied by unit price, then sum line amounts for the document total. Discounts and taxes are excluded from the initial release. Inventory valuation and cost of goods sold are also excluded.

## 5 Purchasing and goods receiving

### 5.1 Purchase orders

**PO-01** Purchasing officers can create draft purchase orders containing a supplier, destination store, expected receipt date, and at least one product line. Ordered quantities must be positive whole numbers and purchase unit prices cannot be negative. Duplicate SKUs within one order are prohibited.

**PO-02** Purchase order statuses are Draft, Pending Approval, Approved, Partially Received, Completed, Rejected, and Cancelled. Creating or approving an order does not change stock.

**PO-03** Drafts can be edited and submitted when complete. Managers can approve or reject submitted orders with a reason. Approved lines, quantities, prices, and destination stores cannot change. Rejected orders remain viewable; resubmission requires a new order.

**PO-04** Only Draft or Pending Approval orders can be cancelled, by the creator or a manager, with a reason. Cancellation of Approved or partially received orders is excluded from the initial release.

### 5.2 Goods receipts

**GR-01** Store employees can receive only Approved or Partially Received orders for their assigned store. The receiving screen shows ordered, previously received, and outstanding quantities for every line.

**GR-02** Partial receipts across multiple deliveries are supported. Each received quantity must be a non-negative whole number, with at least one line greater than zero. Cumulative receipts cannot exceed ordered quantities. Products outside the order cannot be added.

**GR-03** Confirmation creates a goods receipt number, increases destination-store stock, and records inventory movements. The order becomes Partially Received if any quantity remains outstanding, or Completed when every line is fully received.

**GR-04** Repeated confirmation clicks, duplicate requests, and retries after network failures must not increase stock twice. Repeating the same operation must return the original receipt. A deliberately new receipt must still be possible.

**GR-05** Concurrent receiving requests must not exceed the order quantity in total. Confirmed receipts remain viewable but cannot be edited or cancelled. Receipt reversals are excluded.

**Business example.** An order contains 20 units of drinking water and the store initially holds 10 units. Receiving 8 units increases stock to 18, leaves 12 outstanding, and sets the order to Partially Received. Receiving the remaining 12 increases stock to 30 and sets the order to Completed.

## 6 Sales and reporting

### 6.1 Sales recording

**SAL-01** Store employees can create sales for their assigned store using active products and positive whole-number quantities. Apply the current selling price and retain it in the document. Users cannot override prices.

**SAL-02** Draft sales do not reduce stock. On confirmation, validate the latest stock for every line. If any product has insufficient stock, reject the entire document and identify the affected products. Partial posting is prohibited.

**SAL-03** Successful confirmation generates a document number, records the sale, and decreases stock with movement history in one transaction. Duplicate confirmation must not create another sale or deduct stock again.

**SAL-04** Confirmed sales can be viewed but cannot be edited, cancelled, or returned in the initial release. Real payments and customer personal data are excluded.

### 6.2 Reports and search

**RPT-01** Provide daily sales reports filtered by date range and store. Include only successfully confirmed sales and show document count, units sold, and total sales amount.

**RPT-02** Provide stock-on-hand and low-stock reports by store, with product search. Zero-stock products must remain visible when they match the filters.

**RPT-03** Provide movement history filtered by product, store, movement type, and date range, with access to the source document. Store employees see their assigned store only; managers see all stores.

**RPT-04** Export sales and stock reports as CSV supporting Thai text. Apply the same filters and permissions as the screen. Safely handle values that spreadsheet software may interpret as formulas.

**Display and calculation rules.** A reporting day runs from 00:00:00 inclusive to the next day at 00:00:00 exclusive in Asia/Bangkok. Use the sale confirmation timestamp. Show zero totals and a clear empty-state message when no records match. Display monetary amounts to two decimal places.

Lists must support pagination and newest-first ordering. Screens must show loading, success, and error states. Error messages must explain whether the user should correct input or retry the operation.

## 7 System quality and deliverables

### 7.1 Nonfunctional requirements

**NFR-01** Authentication is required before accessing data. Enforce both role and store permissions at the API for every request. Hiding interface buttons alone does not satisfy this requirement.

**NFR-02** Do not store passwords as readable text or log passwords, tokens, or secrets. Use non-production test data and keep environment configuration separate from source code.

**NFR-03** Audit approvals, goods receipts, sales, and stock adjustments with actor, timestamp, source document, and outcome. Restrict audit access according to permissions.

**NFR-04** Validate input in both the interface and API. Provide actionable Thai error messages without exposing stack traces or database details.

**NFR-05** In an agreed test environment, support 1,000 products, 10,000 movements, and 10 simulated concurrent users. Search and stock-view APIs must achieve p95 response times of no more than 2 seconds during a continuous 5-minute test. CSV exports are excluded.

**NFR-06** Core screens must support desktop browsers and versions agreed before user acceptance testing, at a viewport width of 1366 pixels. Label input fields and support core operations using the keyboard.

### 7.2 System deliverables

Deliver source code, installation instructions, startup and test commands, example configuration, data structures and migrations, seed data, test accounts, API documentation, and known limitations.

For each requirement, provide confirmed acceptance criteria, traceability to the delivered functionality, test results, and evidence of technical review. Provide operating instructions and a documented handover to RetailOne.

### 7.3 Acceptance conditions

All UAT cases within the agreed scope must pass. No defects may remain that cause incorrect stock, duplicate posting, permission bypass, or data loss. Resolve open questions before using the affected requirements for acceptance.

Acceptance covers all requirements in the agreed release baseline. Before go-live, RetailOne shall approve the deployment plan, operating responsibilities, security configuration, backup and restore arrangements, and outstanding issue register. User acceptance and go-live authorization shall be recorded separately.

## 8 Sample data and acceptance scenarios

### 8.1 Starting data for each scenario

Stores: B01 Central Store and B02 Riverside Store. Supplier: SUP01 SupplyOne Co Ltd. Test users: buyer01, staff_b01, staff_b02, and manager01, with the roles in Section 2. Reset data for each scenario; do not rely on the outcome of a previous scenario.

| SKU    | Product                  | B01 stock | Selling price |
| ------ | ------------------------ | --------- | ------------- |
| SKU001 | Drinking water pack of 6 | 10 packs  | 60.00         |
| SKU002 | Tissue paper             | 5 packs   | 35.00         |
| SKU003 | Laundry detergent        | 0 bags    | 120.00        |

All B02 balances are zero. Every product has a reorder threshold of 3. Purchase order PO-DEMO-001 is Approved for B01 and contains 20 packs of SKU001 at a purchase price of THB 45.00 per pack, with no previous receipts.

### 8.2 Example acceptance criteria

**AC-01 | GR-01 to GR-03** When staff_b01 receives 8 packs of SKU001 against PO-DEMO-001, B01 stock becomes 18, outstanding quantity is 12, and status is Partially Received. Exactly one receipt and one receipt movement exist.

**AC-02 | GR-04** From the starting data, successfully receive 8 first, then resend the same request. Return the original receipt; stock remains 18 and cumulative received quantity remains 8.

**AC-03 | GR-02 and GR-05** From the starting data, attempting to receive 21 is rejected. No receipt or movement is created; stock remains 10 and order status remains Approved.

**AC-04 | GR-01 and NFR-01** A direct API request by staff_b02 to receive goods for B01 is rejected. No business data changes.

**AC-05 | SAL-02** Selling 11 packs of SKU001 when opening stock is 10 fails. No confirmed sale or stock deduction is created.

**AC-06 | SAL-01 to SAL-03** Selling 2 packs of SKU001 and 1 pack of SKU002 totals THB 155.00. Balances become 8 and 4 respectively. Resending the same request causes no further changes.

**AC-07 | INV-04** With SKU001 stock at 10, submit two concurrent sales of 7 each. Exactly one succeeds, the other is rejected, and final stock is 3.

**AC-08 | RPT-01 and RPT-02** When no sales exist on the selected day, sales totals are zero. SKU003 appears in the B01 low-stock report because its balance of 0 is at or below the threshold of 3.

## 9 Delivery and project responsibilities

### 9.1 Delivery approach

The supplier shall propose an implementation plan covering requirements confirmation, solution design, development, testing, deployment, and handover. Proposed dates, dependencies, resources, and acceptance checkpoints shall be agreed before work starts. No specific programming language, framework, development tool, or vendor product is mandated by this TOR.

The proposed solution shall explain how it meets the functional requirements, data integrity rules, security controls, and performance targets. Any third-party service, license, recurring cost, or deployment dependency shall be identified for RetailOne approval before adoption.

### 9.2 Milestones and approval evidence

| Milestone               | Required output                                                                                    | Approval owner                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Requirements baseline   | Confirmed scope, resolved clarifications, requirement traceability, and acceptance plan.           | RetailOne business owner                         |
| Solution design         | System and data design, access controls, deployment proposal, and test strategy.                   | RetailOne technical representative               |
| UAT readiness           | Working release, test accounts and data, supplier test results, and known issue register.          | RetailOne business and technical representatives |
| Acceptance and handover | UAT results, resolved defects, delivery package, operating instructions, and deployment readiness. | RetailOne authorized representative              |

### 9.3 Responsibilities

RetailOne shall appoint a business owner, provide timely business decisions, nominate acceptance testers, and approve access to agreed environments. The supplier shall maintain the delivery plan and issue register, protect supplied information, implement the agreed scope, and provide evidence that each requirement has been tested.

The supplier shall deliver deployment and rollback instructions and demonstrate backup and restoration in the agreed environment. Production access and changes require authorization from RetailOne. Ownership of hosting, monitoring, backups, incident handling, and ongoing support shall be agreed before go-live.

### 9.4 Commercial and support arrangements

Pricing, payment milestones, delivery dates, source-code ownership, third-party licenses, warranty duration, and support response targets shall be defined in the commercial agreement. Proposed exclusions or deviations from this TOR must be stated explicitly and approved before implementation.

## 10 Clarifications and change control

### 10.1 Requirements clarification

Maintain a clarification register containing the question ID, business decision, approving stakeholder, date, affected requirements, and associated tests. Resolve questions affecting current scope before design approval. Future capabilities remain excluded until an authorized change is approved.

**Q-01** Confirm whether future high-value purchase orders require multiple approvers, approval thresholds, or delegation. The initial release uses the single-manager approval process in PO-03.

**Q-02** Confirm whether products deactivated after purchase-order approval may still be received against that order, and who authorizes this exception. Record the decision before implementing and accepting this scenario.

**Q-03** Confirm whether backdated receiving is required for a future release. The current baseline uses the system confirmation timestamp.

**Q-04** Confirm the authorization and document rules for future reversals of incorrect receipts or sales. Reversals remain outside the initial scope.

**Q-05** Confirm future requirements for different purchase and sales units or barcode scanning, including conversion and rounding rules. The initial release uses one base unit per SKU.

### 10.2 Change request process

A change request shall describe the business need, affected requirements, proposed behavior, acceptance criteria, and impacts on data, permissions, integration, cost, schedule, and support. The supplier shall assess these impacts and obtain written approval from the authorized RetailOne representative before implementing the change.

Approved changes shall update the requirements baseline, delivery plan, and test coverage. Rejected or deferred requests shall remain in the register with their status and decision reason. Changes must not be treated as accepted solely because they were discussed or demonstrated.

### 10.3 CR-01 Damaged goods on receipt

Status: Under consideration and excluded from the approved baseline. Store operations has requested the ability to record usable and damaged quantities separately when a supplier delivers damaged items, while allowing purchasing to follow up on outstanding quantities and management to report on damage.

Before approval, determine how delivered, usable, and damaged quantities relate; whether damaged goods count toward order fulfillment; where damaged stock is held; required evidence; and authorization rules. Assess the impact on GR-02, GR-03, GR-05, inventory history, and reporting.

The proposal must define acceptance criteria for normal receipt, invalid quantities, duplicate requests, concurrent receiving, and unauthorized access. Damaged goods must not increase sellable stock unless an explicit business rule authorizes the relevant stock treatment.
