module Supply
  module Portal
    module_function
    def posted_stock_value(property)
      account = property.company.accounts.find_by(account_code:"1300")
      return 0.to_d unless account
      lines = account.journal_lines.joins(:journal_entry).where(journal_entries:{property_id:property.id,status:"POSTED"})
      lines.sum(:debit)-lines.sum(:credit)
    end
    def invoice(record)
      service = Invoices.new(record.purchase_order)
      {id:record.id,documentNumber:record.document_number,invoiceReference:record.invoice_reference,invoiceDate:record.invoice_date,dueDate:record.due_date,
        orderId:record.purchase_order_id,supplierName:record.supplier.name,status:record.status,version:record.lock_version,subTotal:record.sub_total.to_f,
        taxRate:record.tax_rate.to_f,taxAmount:record.tax_amount.to_f,grandTotal:record.grand_total.to_f,declaredTotal:record.declared_total.to_f,
        totalPaid:record.total_paid.to_f,balanceDue:record.status=="VOID" ? 0 : (record.grand_total-record.total_paid).to_f,voucherNumber:record.journal_entry&.voucher_number,
        reversalVoucher:record.reversal_journal&.voucher_number,voidReason:record.void_reason,notes:record.notes,
        matchErrors:record.status=="DRAFT" ? service.errors(record) : [],matched:record.status.in?(%w[POSTED PAID]),
        items:record.supplier_invoice_lines.map { |line| {id:line.id,movementId:line.stock_movement_id,name:line.stock_movement.inventory_item.name,
          receiptNumber:line.stock_movement.purchase_receipt.receipt_number,quantity:line.quantity.to_f,unitPrice:line.unit_price.to_f,lineTotal:line.line_total.to_f} },
        payments:record.supplier_payments.order(:created_at).map { |p| {id:p.id,number:p.document_number,amount:p.amount.to_f,method:p.payment_method,
          reference:p.transaction_reference,businessDate:p.business_date,account:p.account.name,staff:p.user.full_name,voucherNumber:p.journal_entry.voucher_number} }}
    end
    def movement(record)
      { id: record.id, number: record.document_number, kind: record.kind, itemId: record.inventory_item_id, itemName: record.inventory_item.name,
        sku: record.inventory_item.item_code, quantity: record.quantity.to_f, unit: record.inventory_item.unit_of_measure, unitCost: record.unit_cost.to_f,
        totalCost: record.total_cost.to_f, sourceStore: record.source_store&.name, destinationStore: record.destination_store&.name,
        department: record.department, notes: record.notes, businessDate: record.business_date, staff: record.user.full_name }
    end
    def order(record)
      { id: record.id, poNumber: record.po_number, orderDate: record.order_date, status: record.status, version: record.lock_version,
        supplierId: record.supplier_id, supplier: record.supplier&.as_json(only: %i[id name phone email address]), grandTotal: record.grand_total.to_f,
        notes: record.notes, cancellationReason: record.cancellation_reason, invoices:record.supplier_invoices.order(:created_at).map { |i| invoice(i) },
        items: record.purchase_order_items.map { |line| { id: line.id, itemId: line.inventory_item_id, description: line.description,
          unit: line.inventory_item&.unit_of_measure, quantity: line.quantity.to_f, receivedQuantity: line.received_quantity.to_f,
          unitPrice: line.unit_price.to_f, lineTotal: line.line_total.to_f } },
        receipts: record.purchase_receipts.sort_by(&:created_at).map { |receipt| { id: receipt.id, number: receipt.receipt_number,
          store: receipt.store.name, deliveryReference: receipt.delivery_reference, businessDate: receipt.business_date, staff: receipt.user.full_name,
          notes: receipt.notes, accountingPosted:receipt.supply_posting.present?, voucherNumber:receipt.supply_posting&.journal_entry&.voucher_number,
          items: receipt.stock_movements.map { |m| movement(m).merge(orderUnitPrice:m.purchase_order_item.unit_price.to_f,
            unbilledQuantity:(m.quantity-SupplierInvoiceLine.joins(:supplier_invoice).where(stock_movement:m,supplier_invoices:{status:%w[POSTED PAID]}).sum(:quantity)).to_f) } } } }
    end
  end
end
