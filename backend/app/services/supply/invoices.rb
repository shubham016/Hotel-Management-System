module Supply
  class Invoices
    include Support
    def initialize(order)
      @order, @property = order, order.property
      @ledger = Ledger.new(@property)
    end
    def save(params, invoice: nil)
      BusinessDays::Context.with(@property) do
        @order.lock!
        @order.supplier&.lock!
        retry_key = key(params) unless invoice
        request_digest = digest(params, %w[invoiceReference invoiceDate dueDate items taxMode confirmedTaxInvoice declaredTotal notes])
        if !invoice && (existing = @order.supplier_invoices.find_by(creation_key: retry_key))
          invalid!("This identifier was used for another invoice", status: :conflict) unless existing.creation_digest == request_digest
          return existing
        end
        if invoice
          invoice.lock!
          version!(invoice, params)
          invalid!("Only draft invoices can be edited", status: :conflict) unless invoice.status == "DRAFT"
        end
        invalid!("Receive goods before entering an invoice") unless @order.purchase_receipts.exists? && @order.supplier&.company_id == @property.company_id
        reference = params.require(:invoiceReference).to_s.strip.upcase
        date, due = Date.iso8601(params.require(:invoiceDate).to_s), Date.iso8601(params.require(:dueDate).to_s)
        invalid!("Invoice date cannot be after the business date") if date > @property.operating_date
        invalid!("Due date cannot precede the invoice date") if due < date
        requested = params[:items]
        invalid!("Add between 1 and 100 invoice lines") unless requested.is_a?(Array) && requested.size.between?(1,100) && requested.all? { |l| l.is_a?(Hash) || l.is_a?(ActionController::Parameters) }
        ids = requested.map { |line| line[:movementId] }
        invalid!("Select each receipt line once") unless ids.uniq.size == ids.size
        received = movements.where(id: ids).index_by(&:id)
        lines = requested.map do |line|
          movement = received[line[:movementId]]
          invalid!("Select received items from this purchase order") unless movement
          quantity, price = decimal(line[:quantity], positive: true), decimal(line[:unitPrice])
          {stock_movement: movement, quantity:, unit_price: price, line_total: decimal((quantity * price).round(2))}
        end
        mode = params[:taxMode].presence || "NONE"
        invalid!("Select No VAT or Input VAT") unless mode.in?(%w[NONE VAT])
        rate = 0.to_d
        if mode == "VAT"
          invalid!("Confirm that the supplier provided a valid VAT invoice") unless params[:confirmedTaxInvoice] == true
          tax = @property.company.tax_configurations.where(code: "VAT", active: true).for_date(date).to_a
          invalid!("Configure one VAT rate for the invoice date", status: :conflict) unless tax.size == 1
          rate = tax.first.rate
        end
        subtotal = decimal(lines.sum { |line| line[:line_total] })
        vat = decimal((subtotal * rate / 100).round(2))
        total = decimal(subtotal + vat)
        invoice ||= @order.supplier_invoices.new(company: @property.company, property: @property, supplier: @order.supplier, user: Current.user,
          document_number: number(@property,"SUPPLIER_INVOICE"), creation_key: retry_key, creation_digest: request_digest)
        invoice.assign_attributes(invoice_reference: reference, invoice_date: date, due_date: due, sub_total: subtotal, tax_rate: rate,
          tax_amount: vat, grand_total: total, declared_total: decimal(params.require(:declaredTotal)), notes: params[:notes])
        invoice.save!
        invoice.supplier_invoice_lines.destroy_all
        lines.each { |line| invoice.supplier_invoice_lines.create!(line) }
        audit(@property,"SAVE_INVOICE",invoice,{reference:,total: total.to_s})
        invoice
      end
    rescue Date::Error
      invalid!("Enter valid invoice and due dates")
    rescue ActiveRecord::RecordNotUnique
      invalid!("This supplier invoice number has already been entered", code: "DUPLICATE_INVOICE", status: :conflict)
    end
    def errors(invoice)
      return [] if invoice.status.in?(%w[POSTED PAID])
      result = []
      result << "Supplier invoice total differs from the calculated total" unless invoice.declared_total == invoice.grand_total
      result << "Invoice has no received items" unless invoice.supplier_invoice_lines.any?
      invoice.supplier_invoice_lines.includes(stock_movement: [:inventory_item,:purchase_order_item,:purchase_receipt]).each do |line|
        movement = line.stock_movement
        prefix = movement.inventory_item.name
        used = allocated(movement).sum(:quantity)
        result << "#{prefix}: invoiced quantity exceeds unbilled received quantity" if line.quantity > movement.quantity - used
        result << "#{prefix}: invoice price differs from the purchase order" unless line.unit_price == movement.purchase_order_item.unit_price
        result << "Reconcile earlier goods receipt #{movement.purchase_receipt.receipt_number} before posting" unless movement.purchase_receipt.supply_posting
      end
      result
    end
    def post(invoice, params)
      BusinessDays::Context.with(@property) do
        @order.lock!;invoice.lock!
        return invoice if invoice.status.in?(%w[POSTED PAID])
        version!(invoice, params)
        invalid!("Only draft invoices can be posted", status: :conflict) unless invoice.status == "DRAFT"
        @ledger.ready!
        failures = errors(invoice)
        invalid!(failures.join(". "), code: "INVOICE_NOT_MATCHED", status: :conflict) if failures.any?
        lines = invoice.supplier_invoice_lines.includes(:stock_movement).to_a
        lines.each do |line|
          m = line.stock_movement
          prior = allocated(m)
          remaining_quantity = m.quantity - prior.sum(:quantity)
          remaining_cost = m.total_cost - prior.sum(:received_cost)
          cost = decimal((remaining_cost * line.quantity / remaining_quantity).round(2))
          line.update!(received_cost: cost)
        end
        cost = lines.sum(&:received_cost)
        variance = invoice.sub_total - cost
        postings = [[@ledger.grni,cost,0],[@ledger.input_vat,invoice.tax_amount,0],[@ledger.payable,0,invoice.grand_total]]
        postings << [@ledger.rounding, [variance,0].max,[-variance,0].max] unless variance.zero?
        entry = @ledger.journal("SUPPLIER_INVOICE:#{invoice.id}","Supplier invoice #{invoice.invoice_reference} - #{@order.po_number}",postings)
        invoice.update!(status: invoice.grand_total.zero? ? "PAID" : "POSTED", journal_entry: entry, posted_at: Time.current)
        audit(@property,"POST_INVOICE",invoice,{reference: invoice.invoice_reference,voucher: entry&.voucher_number})
        invoice
      end
    end
    def void(invoice, params)
      BusinessDays::Context.with(@property) do
        @order.lock!;invoice.lock!
        return invoice if invoice.status == "VOID" && invoice.void_reason == params[:reason].to_s.strip
        version!(invoice, params)
        invalid!("Paid invoices cannot be voided", status: :conflict) unless invoice.status.in?(%w[DRAFT POSTED]) && invoice.total_paid.zero?
        reason = params[:reason].to_s.strip
        invalid!("Enter the void reason") if reason.length < 3
        original = invoice.journal_entry
        reversal = if original
          @ledger.journal("SUPPLIER_VOID:#{invoice.id}","Void supplier invoice #{invoice.invoice_reference}",original.journal_lines.map { |line| [line.account,line.credit,line.debit] })
        end
        invoice.update!(status:"VOID",void_reason:reason,voided_at:Time.current,reversal_journal:reversal)
        audit(@property,"VOID_INVOICE",invoice,{reason:,reversal:reversal&.voucher_number})
        invoice
      end
    end
    def pay(invoice, params)
      BusinessDays::Context.with(@property) do
        invoice.lock!
        retry_key = key(params)
        request_digest = Digest::SHA256.hexdigest(invoice.id + digest(params,%w[amount paymentMethod accountId transactionRef]))
        if (existing = SupplierPayment.find_by(property:@property,idempotency_key:retry_key))
          invalid!("This identifier was used for another payment",status: :conflict) unless existing.request_digest == request_digest
          return invoice
        end
        BusinessDays::Context.ensure_cashier_open!(@property)
        invalid!("Post and match the invoice before paying",status: :conflict) unless invoice.status == "POSTED"
        amount = decimal(params.require(:amount),positive:true)
        invalid!("Payment exceeds the invoice balance") if amount > invoice.grand_total - invoice.total_paid
        method = params.require(:paymentMethod).to_s
        invalid!("Select Cash or Bank Transfer") unless method.in?(%w[CASH BANK_TRANSFER])
        cash = @property.company.accounts.find(params.require(:accountId))
        invalid!("Select an active cash or bank account") unless cash.active && cash.cash_or_bank?
        reference = params[:transactionRef].to_s.strip.upcase
        invalid!("Bank transfer reference is required") if method == "BANK_TRANSFER" && reference.blank?
        entry = @ledger.journal("SUPPLIER_PAYMENT:#{@property.id}:#{retry_key}","Supplier payment - #{invoice.invoice_reference}",[[@ledger.payable,amount,0],[cash,0,amount]],method:,source:"SUPPLIER_PAYMENT")
        payment = invoice.supplier_payments.create!(property:@property,user:Current.user,account:cash,journal_entry:entry,document_number:number(@property,"SUPPLIER_PAYMENT"),
          amount:,payment_method:method,transaction_reference:reference,idempotency_key:retry_key,request_digest:,business_date:@property.operating_date)
        paid = invoice.total_paid + amount
        invoice.update!(total_paid:paid,status:paid == invoice.grand_total ? "PAID" : "POSTED")
        audit(@property,"PAY_SUPPLIER",payment,{invoice:invoice.invoice_reference,amount:amount.to_s,voucher:entry.voucher_number})
        invoice
      end
    rescue ActiveRecord::RecordNotUnique
      invalid!("This payment or bank transfer was already recorded",code:"DUPLICATE_PAYMENT",status: :conflict)
    end
    def movements
      StockMovement.joins(:purchase_receipt).where(purchase_receipts:{purchase_order_id:@order.id},kind:"RECEIPT")
    end
    def allocated(movement)
      SupplierInvoiceLine.joins(:supplier_invoice).where(stock_movement:movement,supplier_invoices:{status:%w[POSTED PAID]})
    end
  end
end
